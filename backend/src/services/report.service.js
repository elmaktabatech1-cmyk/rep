import { prisma } from '../config/database.js';
import { getDateRangeFilter } from '../utils/helpers.js';

export const getSalesDashboard = async (from, to) => {
  const dateFilter = getDateRangeFilter(from, to);
  const where = { status: 'PAID', ...(dateFilter ? { createdAt: dateFilter } : {}) };

  const [current, bySource, topProducts, topCustomers] = await Promise.all([
    prisma.order.aggregate({ where, _sum: { total: true, discount: true }, _count: { id: true }, _avg: { total: true } }),
    prisma.order.groupBy({ by: ['source'], where, _sum: { total: true }, _count: { id: true } }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { status: 'PAID', ...(dateFilter ? { createdAt: dateFilter } : {}) } },
      _sum: { subtotal: true, quantity: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 10,
    }),
    prisma.customer.findMany({ orderBy: { totalSpent: 'desc' }, take: 5, select: { id: true, name: true, totalSpent: true, loyaltyPoints: true } }),
  ]);

  // Daily revenue (raw query for simplicity)
  let byDay = [];
  try {
    byDay = await prisma.$queryRawUnsafe(
      `SELECT DATE(createdAt) as date, COUNT(id) as orders, SUM(total) as revenue FROM \`Order\` WHERE status = 'PAID'${from ? ` AND createdAt >= '${from}'` : ''}${to ? ` AND createdAt <= '${to} 23:59:59'` : ''} GROUP BY DATE(createdAt) ORDER BY date ASC LIMIT 90`
    );
  } catch {}

  const productIds = topProducts.filter((p) => p.productId).map((p) => p.productId);
  const productNames = productIds.length ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, sku: true } }) : [];
  const productMap = Object.fromEntries(productNames.map((p) => [p.id, p]));

  return {
    summary: {
      revenue: parseFloat(current._sum.total || 0),
      orders: current._count.id,
      avgOrderValue: parseFloat(current._avg.total || 0),
      discount: parseFloat(current._sum.discount || 0),
    },
    byDay: (Array.isArray(byDay) ? byDay : []).map((r) => ({ date: r.date, orders: Number(r.orders), revenue: parseFloat(r.revenue) })),
    bySource: bySource.map((s) => ({ source: s.source, revenue: parseFloat(s._sum.total || 0), orders: s._count.id })),
    topProducts: topProducts.map((p) => ({
      product: productMap[p.productId]?.name || 'Custom Item',
      sku: productMap[p.productId]?.sku || 'N/A',
      revenue: parseFloat(p._sum.subtotal || 0),
      quantity: p._sum.quantity || 0,
    })),
    topCustomers: topCustomers.map((c) => ({ id: c.id, name: c.name, totalSpent: parseFloat(c.totalSpent), loyaltyPoints: c.loyaltyPoints })),
  };
};

export const getInventoryReport = async () => {
  const [products, lowStock, totalValue] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, orderBy: { stockQty: 'asc' }, select: { id: true, sku: true, name: true, category: true, stockQty: true, minStockAlert: true, costPrice: true, sellPrice: true } }),
    prisma.$queryRaw`SELECT COUNT(*) as count FROM Product WHERE isActive = true AND stockQty <= minStockAlert`,
    prisma.$queryRaw`SELECT SUM(stockQty * costPrice) as costValue, SUM(stockQty * sellPrice) as retailValue FROM Product WHERE isActive = true`,
  ]);

  return {
    products,
    lowStockCount: Number(lowStock[0]?.count || 0),
    totalCostValue: parseFloat(totalValue[0]?.costValue || 0),
    totalRetailValue: parseFloat(totalValue[0]?.retailValue || 0),
    totalProducts: products.length,
    outOfStock: products.filter((p) => p.stockQty === 0).length,
  };
};
