import crypto from 'crypto';
import { logger } from './logger.js';

export const verifyWooCommerceSignature = (rawBody, signature, secret) => {
  if (!signature || !secret || !rawBody) {
    logger.warn('WooCommerce signature verification: missing parameters');
    return false;
  }
  try {
    const computed = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
    const sigBuf = Buffer.from(signature, 'base64');
    const comBuf = Buffer.from(computed, 'base64');
    if (sigBuf.length !== comBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, comBuf);
  } catch (error) {
    logger.error('WooCommerce signature error', { message: error.message });
    return false;
  }
};

export const parseWooCommerceHeaders = (headers) => ({
  signature: headers['x-wc-webhook-signature'] || null,
  topic: headers['x-wc-webhook-topic'] || null,
  source: headers['x-wc-webhook-source'] || null,
  deliveryId: headers['x-wc-webhook-delivery-id'] || null,
  resource: headers['x-wc-webhook-resource'] || null,
  event: headers['x-wc-webhook-event'] || null,
});
