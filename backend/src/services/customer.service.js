import { prisma } from '../config/database.js';
import { AppError, getPagination, buildPaginationMeta } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

export const listCustomers = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const where = {};
  if (query.search) {
    where.OR = [
      { name: { contains: query.search } },
      { phone: { contains: query.search } },
      { email: { contains: query.search } },
      { deviceModel: { contains: query.search } },
    ];
  }
  if (query.optInWhatsApp !== undefined) where.optInWhatsApp = query.optInWhatsApp === 'true';

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { _count: { select: { orders: true } } } }),
    prisma.customer.count({ where }),
  ]);
  return { customers, pagination: buildPaginationMeta(total, page, limit) };
};

export const getCustomerById = async (id) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: 'desc' }, take: 10, include: { orderItems: { include: { product: { select: { id: true, name: true, sku: true } } } } } },
      messageLogs: { orderBy: { sentAt: 'desc' }, take: 10 },
      referralsMade: { include: { referee: { select: { id: true, name: true } } } },
      _count: { select: { orders: true, messageLogs: true } },
    },
  });
  if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
  return customer;
};

export const createCustomer = async (data) => {
  const existing = await prisma.customer.findUnique({ where: { phone: data.phone } });
  if (existing) throw new AppError('Phone number already registered', 409, 'DUPLICATE_ENTRY');

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      deviceModel: data.deviceModel || null,
      tags: data.tags || [],
      optInWhatsApp: data.optInWhatsApp !== false,
      optInEmail: data.optInEmail !== false,
      referrerId: data.referrerId || null,
    },
  });

  if (data.referrerId) {
    await prisma.referral.create({ data: { referrerId: data.referrerId, refereeId: customer.id, rewardAmount: 0, used: false } });
  }

  logger.info('Customer created', { customerId: customer.id });
  return customer;
};

export const updateCustomer = async (id, data) => {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');

  if (data.phone && data.phone !== customer.phone) {
    const existing = await prisma.customer.findUnique({ where: { phone: data.phone } });
    if (existing) throw new AppError('Phone number already in use', 409, 'DUPLICATE_ENTRY');
  }

  const allowed = ['name', 'phone', 'email', 'deviceModel', 'tags', 'optInWhatsApp', 'optInEmail', 'loyaltyPoints'];
  const updateData = {};
  for (const f of allowed) { if (data[f] !== undefined) updateData[f] = data[f]; }

  return prisma.customer.update({ where: { id }, data: updateData });
};

export const updateCustomerStats = async (customerId, orderTotal, tx = prisma) => {
  return tx.customer.update({
    where: { id: customerId },
    data: { totalSpent: { increment: orderTotal }, lastPurchaseDate: new Date(), loyaltyPoints: { increment: Math.floor(orderTotal) } },
  });
};
