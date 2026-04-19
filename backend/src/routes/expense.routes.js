import { Router } from 'express';
import { z } from 'zod';
import * as expenseController from '../controllers/expense.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validation.js';

const router = Router();
const idParam = z.object({ id: z.string().min(1) });

const expenseQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  category: z.string().max(100).optional(),
  supplierId: z.string().min(1).optional(),
  paymentAccountId: z.string().min(1).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
}).strict();

const expenseSchema = z.object({
  category: z.string().min(2).max(100),
  isFixed: z.boolean().optional(),
  amount: z.coerce.number().positive(),
  description: z.string().max(500).optional().nullable(),
  receiptUrl: z.string().url().optional().nullable(),
  date: z.string().date(),
  supplierId: z.string().min(1).optional().nullable(),
  paymentAccountId: z.string().min(1).optional().nullable(),
}).strict();

const accountSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(['CASH', 'WALLET', 'BANK']),
  openingBalance: z.coerce.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
}).strict();

const transactionSchema = z.object({
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']),
  amount: z.coerce.number().positive(),
  description: z.string().max(255).optional().nullable(),
  accountId: z.string().min(1),
  destinationAccountId: z.string().min(1).optional().nullable(),
  date: z.string().date().optional(),
}).strict();

const supplierSchema = z.object({
  name: z.string().min(2).max(160),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  taxNumber: z.string().max(80).optional().nullable(),
}).strict();

router.use(authenticate, requireRole('ADMIN', 'ACCOUNTANT'));
router.get('/', validate({ query: expenseQuery }), expenseController.listExpenses);
router.post('/', validate({ body: expenseSchema }), expenseController.createExpense);
router.patch('/:id', validate({ params: idParam, body: expenseSchema.partial().strict() }), expenseController.updateExpense);
router.delete('/:id', validate({ params: idParam }), expenseController.deleteExpense);
router.get('/accounts', expenseController.listAccounts);
router.post('/accounts', validate({ body: accountSchema }), expenseController.createAccount);
router.post('/transactions', validate({ body: transactionSchema }), expenseController.recordTransaction);
router.get('/suppliers', expenseController.listSuppliers);
router.post('/suppliers', validate({ body: supplierSchema }), expenseController.createSupplier);
router.get('/profit-loss', validate({ query: z.object({ from: z.string().date().optional(), to: z.string().date().optional() }).strict() }), expenseController.getProfitLoss);

export default router;
