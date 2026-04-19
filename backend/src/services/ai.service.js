import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

let client = null;

const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AppError('AI service not configured', 503, 'SERVICE_UNAVAILABLE');
  }
  client ||= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
};

const TOOLS = [
  { name: 'get_sales_summary', description: 'Get sales revenue and order count for a date range.', input_schema: { type: 'object', properties: { startDate: { type: 'string' }, endDate: { type: 'string' } }, required: ['startDate', 'endDate'] } },
  { name: 'get_top_products', description: 'Get best-selling products by revenue or quantity.', input_schema: { type: 'object', properties: { limit: { type: 'number' }, metric: { type: 'string', enum: ['revenue', 'quantity'] } }, required: [] } },
  { name: 'get_customer_stats', description: 'Get total customers, new this month, top spenders.', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'get_low_stock_products', description: 'Get products below minimum stock level.', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'get_expense_breakdown', description: 'Get expenses grouped by category.', input_schema: { type: 'object', properties: { startDate: { type: 'string' }, endDate: { type: 'string' } }, required: [] } },
];

const executeTool = async (name, input) => {
  switch (name) {
    case 'get_sales_summary': {
      const result = await prisma.order.aggregate({
        where: { status: 'PAID', createdAt: { gte: new Date(input.startDate), lte: new Date(input.endDate + 'T23:59:59Z') } },
        _sum: { total: true, discount: true }, _count: { id: true }, _avg: { total: true },
      });
      return { period: `${input.startDate} to ${input.endDate}`, totalRevenue: parseFloat(result._sum.total || 0), totalOrders: result._count.id, avgOrderValue: parseFloat(result._avg.total || 0).toFixed(2) };
    }
    case 'get_top_products': {
      const limit = input.limit || 5;
      const items = await prisma.orderItem.groupBy({
        by: ['productId'], where: { order: { status: 'PAID' } }, _sum: { subtotal: true, quantity: true },
        orderBy: input.metric === 'quantity' ? { _sum: { quantity: 'desc' } } : { _sum: { subtotal: 'desc' } }, take: limit,
      });
      const products = await Promise.all(items.map(async (item) => {
        const p = item.productId ? await prisma.product.findUnique({ where: { id: item.productId }, select: { name: true, sku: true } }) : null;
        return { product: p?.name || 'Unknown', sku: p?.sku || 'N/A', revenue: parseFloat(item._sum.subtotal || 0), quantity: item._sum.quantity || 0 };
      }));
      return { topProducts: products };
    }
    case 'get_customer_stats': {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const [total, newThisMonth, topSpenders] = await Promise.all([
        prisma.customer.count(),
        prisma.customer.count({ where: { createdAt: { gte: monthStart } } }),
        prisma.customer.findMany({ orderBy: { totalSpent: 'desc' }, take: 5, select: { name: true, totalSpent: true, loyaltyPoints: true } }),
      ]);
      return { totalCustomers: total, newThisMonth, topSpenders: topSpenders.map((c) => ({ name: c.name, totalSpent: parseFloat(c.totalSpent), loyaltyPoints: c.loyaltyPoints })) };
    }
    case 'get_low_stock_products': {
      const products = await prisma.$queryRaw`SELECT sku, name, stockQty, minStockAlert, category FROM Product WHERE isActive = true AND stockQty <= minStockAlert ORDER BY stockQty ASC LIMIT 20`;
      return { lowStockProducts: products, count: products.length };
    }
    case 'get_expense_breakdown': {
      const where = {};
      if (input.startDate) where.date = { gte: new Date(input.startDate) };
      if (input.endDate) where.date = { ...where.date, lte: new Date(input.endDate + 'T23:59:59Z') };
      const breakdown = await prisma.expense.groupBy({ by: ['category'], where, _sum: { amount: true }, _count: { id: true }, orderBy: { _sum: { amount: 'desc' } } });
      return { breakdown: breakdown.map((b) => ({ category: b.category, total: parseFloat(b._sum.amount || 0), count: b._count.id })) };
    }
    default: return { error: `Unknown tool: ${name}` };
  }
};

export const processAiQuery = async (prompt, userId) => {
  let actionsTaken = [];
  let finalResponse = '';

  try {
    const anthropic = getClient();
    const messages = [{ role: 'user', content: prompt }];
    let continueLoop = true;

    while (continueLoop) {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: `You are an intelligent ERP assistant. Today's date: ${new Date().toISOString().split('T')[0]}. Always provide specific numbers and format monetary values with 2 decimal places.`,
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason === 'tool_use') {
        const toolUses = response.content.filter((b) => b.type === 'tool_use');
        const toolResults = [];
        for (const toolUse of toolUses) {
          const result = await executeTool(toolUse.name, toolUse.input);
          actionsTaken.push({ tool: toolUse.name, input: toolUse.input, result });
          toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) });
        }
        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });
      } else {
        finalResponse = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
        continueLoop = false;
      }
    }
  } catch (err) {
    logger.error('AI query error', { message: err.message });
    if (err instanceof AppError) throw err;
    throw new AppError('AI service error', 502, 'AI_ERROR');
  } finally {
    await prisma.aiAuditLog.create({ data: { userId: userId || null, prompt, actionsTaken, status: finalResponse ? 'SUCCESS' : 'FAILED' } })
      .catch((e) => logger.error('AiAuditLog save failed', { message: e.message }));
  }

  return { response: finalResponse, actionsCount: actionsTaken.length };
};
