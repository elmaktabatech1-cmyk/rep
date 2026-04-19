import * as productService from '../services/product.service.js';
import * as inventoryService from '../services/inventory.service.js';
import { sendSuccess, sendCreated } from '../utils/helpers.js';

export const list = async (req, res, next) => {
  try { res.json({ success: true, ...(await productService.listProducts(req.query)) }); } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try { sendSuccess(res, { product: await productService.getProductById(req.params.id) }); } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try { sendCreated(res, { product: await productService.createProduct(req.body, req.user.id) }, 'Product created'); } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try { sendSuccess(res, { product: await productService.updateProduct(req.params.id, req.body) }, 'Product updated'); } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try { await productService.deleteProduct(req.params.id); sendSuccess(res, null, 'Product deactivated'); } catch (err) { next(err); }
};

export const adjustStock = async (req, res, next) => {
  try {
    const result = await inventoryService.adjustStock({ productId: req.params.id, type: req.body.type, quantity: parseInt(req.body.quantity), reason: req.body.reason, userId: req.user.id });
    sendSuccess(res, result, 'Stock adjusted');
  } catch (err) { next(err); }
};

export const getInventoryLogs = async (req, res, next) => {
  try { res.json({ success: true, ...(await inventoryService.getInventoryLogs(req.params.id, req.query)) }); } catch (err) { next(err); }
};

export const getCategories = async (req, res, next) => {
  try { sendSuccess(res, { categories: await productService.getCategories() }); } catch (err) { next(err); }
};

export const getLowStock = async (req, res, next) => {
  try { sendSuccess(res, { products: await inventoryService.getLowStockProducts() }); } catch (err) { next(err); }
};
