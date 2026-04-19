import { prisma } from '../config/database.js';
import { AppError, getPagination, buildPaginationMeta, getDateRangeFilter } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

// ─── Expenses ──────────────────────────────────────────────────────────────────
export const listExpenses = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const where = {};
  if (query.category) where.category = query.category;
  if (query.supplierId) where.supplierId = query.supplierId;
  if (query.paymentAccountId) where.paymentAccountId = query.paymentAccountId;
  const dateFilter = getDateRangeFilter(query.from, query.to);
  if (dateFilter) where.date = dateFilter;

  const [expenses, total, totalAmount] = await Promise.all([
    prisma.expense.findMany({
      where, skip, take: limit, orderBy: { date: 'desc' },
      include: {
        supplier: { select: { id: true, name: true } },
        paymentAccount: { select: { id: true, name: true, type: true } },
        creator: { select: { id: true, name: true } },
      },
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  return { expenses, pagination: buildPaginationMeta(total, page, limit), totalAmount: parseFloat(totalAmount._sum.amount || 0) };
};

export const createExpense = async (data, userId) => {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        category: data.category,
        isFixed: data.isFixed || false,
        amount: data.amount,
        description: data.description || null,
        receiptUrl: data.receiptUrl || null,
        date: new Date(data.date),
        supplierId: data.supplierId || null,
        paymentAccountId: data.paymentAccountId || null,
        createdBy: userId,
      },
    });

    if (data.paymentAccountId) {
      await tx.paymentAccount.update({ where: { id: data.paymentAccountId }, data: { balance: { decrement: data.amount } } });
      await tx.financialTransaction.create({
        data: { type: 'EXPENSE_PAYMENT', amount: data.amount, description: data.description || `Expense: ${data.category}`, accountId: data.paymentAccountId, expenseId: expense.id, date: new Date(data.date) },
      });
    }

    logger.info('Expense created', { expenseId: expense.id, amount: expense.amount });
    return expense;
  });
};

export const updateExpense = async (id, data) => {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw new AppError('Expense not found', 404, 'NOT_FOUND');
  const allowed = ['category', 'isFixed', 'amount', 'description', 'receiptUrl', 'date', 'supplierId'];
  const updateData = {};
  for (const f of allowed) { if (data[f] !== undefined) updateData[f] = f === 'date' ? new Date(data[f]) : data[f]; }
  return prisma.expense.update({ where: { id }, data: updateData });
};

export const deleteExpense = async (id) => {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw new AppError('Expense not found', 404, 'NOT_FOUND');
  await prisma.expense.delete({ where: { id } });
};

// ─── Payment Accounts ──────────────────────────────────────────────────────────
export const listPaymentAccounts = async () =>
  prisma.paymentAccount.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });

export const createPaymentAccount = async (data) =>
  prisma.paymentAccount.create({
    data: { name: data.name, type: data.type, balance: data.openingBalance || 0, openingBalance: data.openingBalance || 0, currency: data.currency || 'USD', isActive: true },
  });

export const recordTransaction = async (data) =>
  prisma.$transaction(async (tx) => {
    const account = await tx.paymentAccount.findUnique({ where: { id: data.accountId } });
    if (!account) throw new AppError('Account not found', 404, 'NOT_FOUND');

    let delta = data.type === 'DEPOSIT' ? data.amount : -data.amount;
    if (account.balance + delta < 0) throw new AppError('Insufficient account balance', 400, 'INSUFFICIENT_BALANCE');

    await tx.paymentAccount.update({ where: { id: data.accountId }, data: { balance: { increment: delta } } });
    if (data.type === 'TRANSFER' && data.destinationAccountId) {
      await tx.paymentAccount.update({ where: { id: data.destinationAccountId }, data: { balance: { increment: data.amount } } });
    }

    return tx.financialTransaction.create({
      data: { type: data.type, amount: data.amount, description: data.description || null, accountId: data.accountId, destinationAccountId: data.destinationAccountId || null, date: new Date(data.date || Date.now()) },
    });
  });

// ─── Suppliers ─────────────────────────────────────────────────────────────────
export const listSuppliers = async () =>
  prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });

export const createSupplier = async (data) =>
  prisma.supplier.create({
    data: { name: data.name, phone: data.phone || null, email: data.email || null, address: data.address || null, taxNumber: data.taxNumber || null, balance: 0, isActive: true },
  });

// ─── P&L Report ────────────────────────────────────────────────────────────────
export const getProfitLoss = async (from, to) => {
  const dateFilter = getDateRangeFilter(from, to);
  const [revenue, expenses] = await Promise.all([
    prisma.order.aggregate({ where: { status: 'PAID', ...(dateFilter ? { createdAt: dateFilter } : {}) }, _sum: { total: true, discount: true } }),
    prisma.expense.aggregate({ where: dateFilter ? { date: dateFilter } : {}, _sum: { amount: true } }),
  ]);

  const grossRevenue = parseFloat(revenue._sum.total || 0);
  const totalExpenses = parseFloat(expenses._sum.amount || 0);
  const grossProfit = grossRevenue - totalExpenses;

  return {
    grossRevenue,
    totalExpenses,
    grossProfit,
    netProfit: grossProfit,
    margin: grossRevenue > 0 ? ((grossProfit / grossRevenue) * 100).toFixed(2) : '0.00',
  };
};
