import { prisma } from '../config/database.js';
import { AppError, getPagination, buildPaginationMeta } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

export const adjustStock = async ({ productId, type, quantity, reason, userId }) => {
  if (quantity <= 0) throw new AppError('Quantity must be positive', 400, 'INVALID_INPUT');

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

    const delta = type === 'IN' || type === 'RETURN' ? quantity : -quantity;
    const newQty = product.stockQty + delta;

    if (newQty < 0) throw new AppError(`Insufficient stock. Available: ${product.stockQty}`, 400, 'INSUFFICIENT_STOCK');

    const [updated, log] = await Promise.all([
      tx.product.update({ where: { id: productId }, data: { stockQty: newQty } }),
      tx.inventoryLog.create({ data: { productId, type, quantity, reason: reason || null, userId: userId || null } }),
    ]);

    if (newQty <= product.minStockAlert) {
      logger.warn('Low stock alert', { productId, sku: product.sku, stockQty: newQty, minStockAlert: product.minStockAlert });
    }

    return { product: updated, log };
  });
};

export const deductStockForOrder = async (items, userId, tx) => {
  for (const item of items) {
    if (!item.productId) continue;
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new AppError(`Product ${item.productId} not found`, 404, 'NOT_FOUND');

    const newQty = product.stockQty - item.quantity;
    if (newQty < 0) throw new AppError(`Insufficient stock for "${product.name}". Available: ${product.stockQty}`, 400, 'INSUFFICIENT_STOCK');

    await tx.product.update({ where: { id: item.productId }, data: { stockQty: newQty } });
    await tx.inventoryLog.create({ data: { productId: item.productId, type: 'OUT', quantity: item.quantity, reason: 'Sale', userId } });
  }
};

export const restoreStockForOrder = async (items, userId, tx) => {
  for (const item of items) {
    if (!item.productId) continue;
    await tx.product.update({ where: { id: item.productId }, data: { stockQty: { increment: item.quantity } } });
    await tx.inventoryLog.create({ data: { productId: item.productId, type: 'RETURN', quantity: item.quantity, reason: 'Order cancelled', userId } });
  }
};

export const getLowStockProducts = async () => {
  return prisma.$queryRaw`
    SELECT id, sku, name, category, stockQty, minStockAlert
    FROM Product WHERE isActive = true AND stockQty <= minStockAlert
    ORDER BY stockQty ASC
  `;
};

export const getInventoryLogs = async (productId, query) => {
  const { page, limit, skip } = getPagination(query);
  const where = productId ? { productId } : {};
  const [logs, total] = await Promise.all([
    prisma.inventoryLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { product: { select: { id: true, name: true, sku: true } }, user: { select: { id: true, name: true } } } }),
    prisma.inventoryLog.count({ where }),
  ]);
  return { logs, pagination: buildPaginationMeta(total, page, limit) };
};
