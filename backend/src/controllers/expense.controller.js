import * as accountingService from '../services/accounting.service.js';
import { sendSuccess, sendCreated } from '../utils/helpers.js';

export const listExpenses = async (req, res, next) => {
  try { res.json({ success: true, ...(await accountingService.listExpenses(req.query)) }); } catch (err) { next(err); }
};
export const createExpense = async (req, res, next) => {
  try { sendCreated(res, { expense: await accountingService.createExpense(req.body, req.user.id) }, 'Expense recorded'); } catch (err) { next(err); }
};
export const updateExpense = async (req, res, next) => {
  try { sendSuccess(res, { expense: await accountingService.updateExpense(req.params.id, req.body) }, 'Expense updated'); } catch (err) { next(err); }
};
export const deleteExpense = async (req, res, next) => {
  try { await accountingService.deleteExpense(req.params.id); sendSuccess(res, null, 'Expense deleted'); } catch (err) { next(err); }
};

export const listAccounts = async (req, res, next) => {
  try { sendSuccess(res, { accounts: await accountingService.listPaymentAccounts() }); } catch (err) { next(err); }
};
export const createAccount = async (req, res, next) => {
  try { sendCreated(res, { account: await accountingService.createPaymentAccount(req.body) }, 'Account created'); } catch (err) { next(err); }
};
export const recordTransaction = async (req, res, next) => {
  try { sendCreated(res, { transaction: await accountingService.recordTransaction(req.body) }, 'Transaction recorded'); } catch (err) { next(err); }
};

export const listSuppliers = async (req, res, next) => {
  try { sendSuccess(res, { suppliers: await accountingService.listSuppliers() }); } catch (err) { next(err); }
};
export const createSupplier = async (req, res, next) => {
  try { sendCreated(res, { supplier: await accountingService.createSupplier(req.body) }, 'Supplier created'); } catch (err) { next(err); }
};

export const getProfitLoss = async (req, res, next) => {
  try { sendSuccess(res, await accountingService.getProfitLoss(req.query.from, req.query.to)); } catch (err) { next(err); }
};
