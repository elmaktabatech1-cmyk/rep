import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export const resolveSegmentCustomers = async (filters = {}) => {
  const where = {};

  if (filters.totalSpent) {
    where.totalSpent = {};
    if (filters.totalSpent.gte !== undefined) where.totalSpent.gte = filters.totalSpent.gte;
    if (filters.totalSpent.lte !== undefined) where.totalSpent.lte = filters.totalSpent.lte;
  }
  if (filters.lastPurchaseDate) {
    where.lastPurchaseDate = {};
    if (filters.lastPurchaseDate.gte) where.lastPurchaseDate.gte = new Date(filters.lastPurchaseDate.gte);
    if (filters.lastPurchaseDate.lte) where.lastPurchaseDate.lte = new Date(filters.lastPurchaseDate.lte);
  }
  if (filters.loyaltyPoints) {
    where.loyaltyPoints = {};
    if (filters.loyaltyPoints.gte !== undefined) where.loyaltyPoints.gte = filters.loyaltyPoints.gte;
    if (filters.loyaltyPoints.lte !== undefined) where.loyaltyPoints.lte = filters.loyaltyPoints.lte;
  }
  if (filters.optInWhatsApp !== undefined) where.optInWhatsApp = filters.optInWhatsApp;
  if (filters.optInEmail !== undefined) where.optInEmail = filters.optInEmail;
  if (filters.deviceModel) where.deviceModel = { contains: filters.deviceModel };

  let customers = await prisma.customer.findMany({
    where,
    select: {
      id: true, name: true, phone: true, email: true,
      optInWhatsApp: true, optInEmail: true,
      totalSpent: true, loyaltyPoints: true, tags: true,
      _count: { select: { orders: true } },
    },
  });

  if (filters.orderCount) {
    customers = customers.filter((c) => {
      const count = c._count.orders;
      if (filters.orderCount.gte !== undefined && count < filters.orderCount.gte) return false;
      if (filters.orderCount.lte !== undefined && count > filters.orderCount.lte) return false;
      return true;
    });
  }

  return customers;
};

export const updateSegmentCount = async (segmentId) => {
  const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
  if (!segment) return 0;
  try {
    const customers = await resolveSegmentCustomers(segment.filters);
    await prisma.segment.update({ where: { id: segmentId }, data: { customerCount: customers.length } });
    return customers.length;
  } catch (err) {
    logger.error('Segment count update failed', { segmentId, message: err.message });
    return 0;
  }
};

export const listSegments = async () =>
  prisma.segment.findMany({ orderBy: { name: 'asc' } });

export const createSegment = async (data) => {
  const segment = await prisma.segment.create({ data: { name: data.name, description: data.description || null, filters: data.filters, customerCount: 0 } });
  const count = await updateSegmentCount(segment.id);
  return { ...segment, customerCount: count };
};

export const updateSegment = async (id, data) => {
  const segment = await prisma.segment.update({ where: { id }, data: { name: data.name, description: data.description, filters: data.filters, updatedAt: new Date() } });
  await updateSegmentCount(id);
  return segment;
};
