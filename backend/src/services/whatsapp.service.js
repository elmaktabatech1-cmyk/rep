import { prisma } from '../config/database.js';
import { AppError, sleep } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

const API_VERSION = 'v18.0';
const getUrl = () => `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
const getHeaders = () => ({ Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' });

const checkConfig = () => {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new AppError('WhatsApp not configured', 503, 'SERVICE_UNAVAILABLE');
  }
};

const logMessage = async (customerId, campaignId, template, status, apiResponse) => {
  if (!customerId) return;
  await prisma.messageLog.create({
    data: { customerId, campaignId: campaignId || null, channel: 'WHATSAPP', template, status, apiResponse, sentAt: new Date() },
  }).catch((e) => logger.error('MessageLog save failed', { message: e.message }));
};

export const sendTextMessage = async (to, text, customerId = null, campaignId = null) => {
  checkConfig();
  const body = { messaging_product: 'whatsapp', recipient_type: 'individual', to: to.replace(/[^\d+]/g, ''), type: 'text', text: { preview_url: false, body: text } };

  let apiResponse = null;
  let status = 'SENT';
  try {
    const res = await fetch(getUrl(), { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
    apiResponse = await res.json();
    if (!res.ok) { status = 'FAILED'; throw new AppError(apiResponse.error?.message || 'WhatsApp send failed', 502, 'WHATSAPP_ERROR'); }
  } catch (err) {
    status = 'FAILED';
    if (err instanceof AppError) throw err;
    throw new AppError('WhatsApp service unreachable', 503, 'SERVICE_UNAVAILABLE');
  } finally {
    await logMessage(customerId, campaignId, 'text', status, apiResponse);
  }
  return apiResponse;
};

export const sendTemplateMessage = async (to, templateName, languageCode = 'en_US', components = [], customerId = null, campaignId = null) => {
  checkConfig();
  const body = { messaging_product: 'whatsapp', to: to.replace(/[^\d+]/g, ''), type: 'template', template: { name: templateName, language: { code: languageCode }, components } };

  let apiResponse = null;
  let status = 'SENT';
  try {
    const res = await fetch(getUrl(), { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
    apiResponse = await res.json();
    if (!res.ok) { status = 'FAILED'; throw new AppError(apiResponse.error?.message || 'Template send failed', 502, 'WHATSAPP_ERROR'); }
  } catch (err) {
    status = 'FAILED';
    if (err instanceof AppError) throw err;
    throw new AppError('WhatsApp service unreachable', 503, 'SERVICE_UNAVAILABLE');
  } finally {
    await logMessage(customerId, campaignId, templateName, status, apiResponse);
  }
  return apiResponse;
};

export const sendBulkMessages = async (campaign, customers) => {
  let sentCount = 0;
  const results = [];
  const config = campaign.channelConfig || {};
  const messageText = config.message || `Hi {{name}}, ${campaign.name}`;

  for (const customer of customers) {
    if (!customer.optInWhatsApp) continue;
    try {
      const text = messageText.replace(/\{\{name\}\}/g, customer.name);
      await sendTextMessage(customer.phone, text, customer.id, campaign.id);
      sentCount++;
      results.push({ customerId: customer.id, status: 'sent' });
      await sleep(100); // 10 msg/sec rate limit
    } catch (err) {
      logger.warn('Bulk send failed for customer', { customerId: customer.id, message: err.message });
      results.push({ customerId: customer.id, status: 'failed', error: err.message });
    }
  }
  return { sentCount, results };
};
