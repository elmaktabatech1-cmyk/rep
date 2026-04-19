import { prisma } from '../config/database.js';
import { AppError, getPagination, buildPaginationMeta } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

export const listProducts = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const where = { isActive: query.isActive !== undefined ? query.isActive === 'true' : true };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search } },
      { sku: { contains: query.search } },
      { category: { contains: query.search } },
    ];
  }
  if (query.category) where.category = query.category;

  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.product.count({ where }),
  ]);

  const lowStockResult = await prisma.$queryRaw`
    SELECT COUNT(*) as cnt FROM Product WHERE isActive = true AND stockQty <= minStockAlert
  `;

  return {
    products,
    pagination: buildPaginationMeta(total, page, limit),
    lowStockCount: Number(lowStockResult[0]?.cnt || 0),
  };
};

export const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      inventoryLogs: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return product;
};

export const createProduct = async (data, userId) => {
  const product = await prisma.product.create({
    data: {
      sku: data.sku.toUpperCase().trim(),
      name: data.name,
      category: data.category,
      costPrice: data.costPrice,
      sellPrice: data.sellPrice,
      stockQty: data.stockQty || 0,
      minStockAlert: data.minStockAlert || 5,
      compatibility: data.compatibility || [],
      warrantyMonths: data.warrantyMonths || 0,
      images: data.images || [],
      isActive: true,
    },
  });

  if (product.stockQty > 0) {
    await prisma.inventoryLog.create({
      data: { productId: product.id, type: 'IN', quantity: product.stockQty, reason: 'Initial stock', userId },
    });
  }

  logger.info('Product created', { productId: product.id, sku: product.sku });
  return product;
};

export const updateProduct = async (id, data) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  const allowed = ['name', 'category', 'costPrice', 'sellPrice', 'minStockAlert', 'compatibility', 'warrantyMonths', 'images', 'isActive'];
  const updateData = {};
  for (const f of allowed) { if (data[f] !== undefined) updateData[f] = data[f]; }

  return prisma.product.update({ where: { id }, data: updateData });
};

export const deleteProduct = async (id) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  await prisma.product.update({ where: { id }, data: { isActive: false } });
  logger.info('Product deactivated', { productId: id });
};

export const getCategories = async () => {
  const result = await prisma.product.findMany({
    where: { isActive: true },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });
  return result.map((r) => r.category);
};
