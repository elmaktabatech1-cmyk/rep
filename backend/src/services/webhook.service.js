import { prisma } from '../config/database.js';
import { createOrder } from './order.service.js';
import { logger } from '../utils/logger.js';

export const processWooCommerceOrder = async (payload, deliveryId) => {
  const externalId = String(payload.id);

  const existing = await prisma.order.findUnique({ where: { externalOrderId: externalId } });
  if (existing) {
    logger.info('WooCommerce duplicate order ignored', { externalId, orderId: existing.id });
    await prisma.webhookLog.create({ data: { source: 'WOOCOMMERCE', externalId, payload, status: 'DUPLICATE', processedAt: new Date() } });
    return { skipped: true, reason: 'duplicate', orderId: existing.id };
  }

  let order = null;
  let webhookStatus = 'PROCESSED';
  let errorMessage = null;

  try {
    let customerId = null;
    if (payload.billing?.phone || payload.billing?.email) {
      const phone = payload.billing.phone?.replace(/[^\d+]/g, '') || null;
      const email = payload.billing.email?.toLowerCase() || null;

      let customer = phone ? await prisma.customer.findUnique({ where: { phone } }) : null;
      if (!customer && email) customer = await prisma.customer.findFirst({ where: { email } });
      if (!customer && (phone || email)) {
        customer = await prisma.customer.create({
          data: {
            name: `${payload.billing.first_name || ''} ${payload.billing.last_name || ''}`.trim() || 'WooCommerce Customer',
            phone: phone || `wc-${externalId}`,
            email: email || null,
            optInWhatsApp: false,
            optInEmail: true,
            tags: ['woocommerce'],
          },
        });
      }
      customerId = customer?.id || null;
    }

    const items = (payload.line_items || []).map((lineItem) => ({
      productId: null,
      quantity: lineItem.quantity,
      priceAtSale: parseFloat(lineItem.price),
    }));

    const statusMap = { pending: 'PENDING', processing: 'PAID', completed: 'PAID', shipped: 'SHIPPED', cancelled: 'CANCELLED', refunded: 'CANCELLED' };

    order = await createOrder({
      externalOrderId: externalId,
      source: 'WOOCOMMERCE',
      customerId,
      channel: 'WooCommerce',
      status: statusMap[payload.status] || 'PENDING',
      paymentMethod: payload.payment_method_title || payload.payment_method || 'unknown',
      subtotal: parseFloat(payload.subtotal || 0),
      discount: parseFloat(payload.discount_total || 0),
      tax: parseFloat(payload.total_tax || 0),
      total: parseFloat(payload.total || 0),
      items,
      rawPayload: payload,
    }, null);
  } catch (err) {
    webhookStatus = 'FAILED';
    errorMessage = err.message;
    logger.error('WooCommerce order processing failed', { externalId, message: err.message });
    throw err;
  } finally {
    await prisma.webhookLog.create({ data: { source: 'WOOCOMMERCE', externalId, payload, status: webhookStatus, errorMessage, processedAt: new Date() } })
      .catch((e) => logger.error('WebhookLog save failed', { message: e.message }));
  }

  return { success: true, orderId: order.id };
};

export const getWebhookLogs = async (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, parseInt(query.limit) || 20);
  const skip = (page - 1) * limit;
  const where = {};
  if (query.source) where.source = query.source;
  if (query.status) where.status = query.status;

  const [logs, total] = await Promise.all([
    prisma.webhookLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.webhookLog.count({ where }),
  ]);
  return { logs, total, page, limit };
};
