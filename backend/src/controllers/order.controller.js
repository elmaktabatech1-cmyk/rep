import * as orderService from '../services/order.service.js';
import { generateInvoicePDF } from '../services/invoice.service.js';
import { sendSuccess, sendCreated } from '../utils/helpers.js';

export const list = async (req, res, next) => {
  try { res.json({ success: true, ...(await orderService.listOrders(req.query)) }); } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try { sendSuccess(res, { order: await orderService.getOrderById(req.params.id) }); } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try { sendCreated(res, { order: await orderService.createOrder(req.body, req.user.id) }, 'Order created'); } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try { sendSuccess(res, { order: await orderService.updateOrder(req.params.id, req.body) }, 'Order updated'); } catch (err) { next(err); }
};

export const updateStatus = async (req, res, next) => {
  try { sendSuccess(res, { order: await orderService.updateOrderStatus(req.params.id, req.body.status, req.user.id) }, 'Status updated'); } catch (err) { next(err); }
};

export const getStats = async (req, res, next) => {
  try { sendSuccess(res, await orderService.getOrderStats()); } catch (err) { next(err); }
};

export const downloadInvoice = async (req, res, next) => {
  try { sendSuccess(res, await generateInvoicePDF(req.params.id), 'Invoice generated'); } catch (err) { next(err); }
};
