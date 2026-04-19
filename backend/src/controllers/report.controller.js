import * as reportService from '../services/report.service.js';
import { sendSuccess } from '../utils/helpers.js';

export const salesDashboard = async (req, res, next) => {
  try { sendSuccess(res, await reportService.getSalesDashboard(req.query.from, req.query.to)); } catch (err) { next(err); }
};

export const inventoryReport = async (req, res, next) => {
  try { sendSuccess(res, await reportService.getInventoryReport()); } catch (err) { next(err); }
};
