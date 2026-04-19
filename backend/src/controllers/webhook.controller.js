import { verifyWooCommerceSignature, parseWooCommerceHeaders } from '../utils/wcSignature.js';
import { AppError, sendSuccess } from '../utils/helpers.js';
import * as webhookService from '../services/webhook.service.js';

export const woocommerce = async (req, res, next) => {
  try {
    const secret = process.env.WC_WEBHOOK_SECRET;
    const headers = parseWooCommerceHeaders(req.headers);
    const rawBody = req.rawBody || '';

    if (!verifyWooCommerceSignature(rawBody, headers.signature, secret)) {
      throw new AppError('Invalid WooCommerce webhook signature', 401, 'INVALID_SIGNATURE');
    }

    const result = await webhookService.processWooCommerceOrder(req.body, headers.deliveryId);
    sendSuccess(res, result, 'Webhook processed');
  } catch (err) {
    next(err);
  }
};

export const logs = async (req, res, next) => {
  try {
    res.json({ success: true, ...(await webhookService.getWebhookLogs(req.query)) });
  } catch (err) {
    next(err);
  }
};
