import * as customerService from '../services/customer.service.js';
import { sendSuccess, sendCreated } from '../utils/helpers.js';

export const list = async (req, res, next) => {
  try { res.json({ success: true, ...(await customerService.listCustomers(req.query)) }); } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try { sendSuccess(res, { customer: await customerService.getCustomerById(req.params.id) }); } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try { sendCreated(res, { customer: await customerService.createCustomer(req.body) }, 'Customer created'); } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try { sendSuccess(res, { customer: await customerService.updateCustomer(req.params.id, req.body) }, 'Customer updated'); } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    await customerService.updateCustomer(req.params.id, { optInWhatsApp: false, optInEmail: false });
    sendSuccess(res, null, 'Customer opted out');
  } catch (err) { next(err); }
};
