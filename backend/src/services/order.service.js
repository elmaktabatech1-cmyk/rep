import { prisma } from '../config/database.js';
import { AppError, getPagination, buildPaginationMeta, generateInvoiceNumber } from '../utils/helpers.js';
import { deductStockForOrder, restoreStockForOrder } from './inventory.service.js';
import { updateCustomerStats } from './customer.service.js';
import { logger } from '../utils/logger.js';

export const listOrders = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.source) where.source = query.source;
  if (query.customerId) where.customerId = query.customerId;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) { const d = new Date(query.to); d.setHours(23, 59, 59, 999); where.createdAt.lte = d; }
  }
  if (query.search) {
    where.OR = [
      { externalOrderId: { contains: query.search } },
      { customer: { name: { contains: query.search } } },
      { customer: { phone: { contains: query.search } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where, skip, take: limit, orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        orderItems: { include: { product: { select: { id: true, name: true, sku: true } } } },
        invoice: { select: { id: true, invoiceNumber: true, pdfUrl: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  return { orders, pagination: buildPaginationMeta(total, page, limit) };
};

export const getOrderById = async (id) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      orderItems: { include: { product: true } },
      invoice: true,
      creator: { select: { id: true, name: true } },
    },
  });
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
  return order;
};

export const createOrder = async (data, userId) => {
  const order = await prisma.$transaction(async (tx) => {
    let subtotal = 0;
    const itemsData = [];

    for (const item of data.items) {
      const product = item.productId ? await tx.product.findUnique({ where: { id: item.productId } }) : null;
      const price = item.priceAtSale ?? product?.sellPrice ?? 0;
      const lineSubtotal = parseFloat(price) * item.quantity;
      subtotal += lineSubtotal;
      itemsData.push({ productId: item.productId || null, quantity: item.quantity, priceAtSale: parseFloat(price), subtotal: lineSubtotal });
    }

    const discount = parseFloat(data.discount || 0);
    const tax = parseFloat(data.tax || 0);
    const total = subtotal - discount + tax;

    const newOrder = await tx.order.create({
      data: {
        externalOrderId: data.externalOrderId || null,
        source: data.source || 'MANUAL',
        customerId: data.customerId || null,
        channel: data.channel || null,
        status: data.status || 'PENDING',
        paymentMethod: data.paymentMethod || null,
        subtotal, discount, tax, total,
        rawPayload: data.rawPayload || null,
        createdBy: userId,
        orderItems: { create: itemsData },
      },
      include: { orderItems: true },
    });

    if (newOrder.status === 'PAID') {
      await deductStockForOrder(itemsData, userId, tx);
      if (data.customerId) await updateCustomerStats(data.customerId, total, tx);
      await tx.invoice.create({ data: { orderId: newOrder.id, invoiceNumber: generateInvoiceNumber() } });
    }

    return newOrder;
  });

  logger.info('Order created', { orderId: order.id, total: order.total });
  return order;
};

export const updateOrderStatus = async (id, status, userId) => {
  const order = await prisma.order.findUnique({ where: { id }, include: { orderItems: true } });
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

  return prisma.$transaction(async (tx) => {
    const prev = order.status;
    const updated = await tx.order.update({ where: { id }, data: { status }, include: { orderItems: true, customer: { select: { id: true, name: true } } } });

    if (prev !== 'PAID' && status === 'PAID') {
      await deductStockForOrder(order.orderItems, userId, tx);
      if (order.customerId) await updateCustomerStats(order.customerId, parseFloat(order.total), tx);
      const inv = await tx.invoice.findUnique({ where: { orderId: id } });
      if (!inv) await tx.invoice.create({ data: { orderId: id, invoiceNumber: generateInvoiceNumber() } });
    }

    if (prev !== 'CANCELLED' && status === 'CANCELLED' && prev === 'PAID') {
      await restoreStockForOrder(order.orderItems, userId, tx);
      if (order.customerId) {
        await tx.customer.update({ where: { id: order.customerId }, data: { totalSpent: { decrement: parseFloat(order.total) } } });
      }
    }

    logger.info('Order status updated', { orderId: id, from: prev, to: status });
    return updated;
  });
};

export const updateOrder = async (id, data) => {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
  if (order.status === 'CANCELLED') throw new AppError('Cannot update cancelled order', 400, 'INVALID_OPERATION');

  const allowed = ['channel', 'paymentMethod', 'discount', 'tax'];
  const updateData = {};
  for (const f of allowed) { if (data[f] !== undefined) updateData[f] = data[f]; }
  return prisma.order.update({ where: { id }, data: updateData });
};

export const getOrderStats = async () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const month = new Date(today.getFullYear(), today.getMonth(), 1);

  const [todayStats, monthStats, statusCounts] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } }, _sum: { total: true }, _count: { id: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: month }, status: { not: 'CANCELLED' } }, _sum: { total: true }, _count: { id: true } }),
    prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
  ]);

  return {
    today: { revenue: parseFloat(todayStats._sum.total || 0), orders: todayStats._count.id },
    month: { revenue: parseFloat(monthStats._sum.total || 0), orders: monthStats._count.id },
    byStatus: statusCounts.reduce((acc, s) => ({ ...acc, [s.status]: s._count.id }), {}),
  };
};
