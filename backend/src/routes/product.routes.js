import { Router } from 'express';
import { z } from 'zod';
import * as productController from '../controllers/product.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validation.js';

const router = Router();

const idParam = z.object({ id: z.string().min(1) });
const productQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().max(120).optional(),
  category: z.string().max(100).optional(),
  isActive: z.enum(['true', 'false']).optional(),
}).strict();

const productBase = {
  sku: z.string().min(2).max(80),
  name: z.string().min(2).max(180),
  category: z.string().min(2).max(100),
  costPrice: z.coerce.number().nonnegative(),
  sellPrice: z.coerce.number().nonnegative(),
  stockQty: z.coerce.number().int().min(0).optional(),
  minStockAlert: z.coerce.number().int().min(0).optional(),
  compatibility: z.array(z.string().max(100)).optional(),
  warrantyMonths: z.coerce.number().int().min(0).max(120).optional(),
  images: z.array(z.string().url()).optional(),
};

const createProductSchema = z.object(productBase).strict();
const updateProductSchema = z.object({
  name: productBase.name.optional(),
  category: productBase.category.optional(),
  costPrice: productBase.costPrice.optional(),
  sellPrice: productBase.sellPrice.optional(),
  minStockAlert: productBase.minStockAlert,
  compatibility: productBase.compatibility,
  warrantyMonths: productBase.warrantyMonths,
  images: productBase.images,
  isActive: z.boolean().optional(),
}).strict();

const stockSchema = z.object({
  type: z.enum(['IN', 'OUT', 'RETURN', 'ADJUSTMENT']),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().min(2).max(255),
}).strict();

router.use(authenticate);
router.get('/', validate({ query: productQuery }), productController.list);
router.get('/categories', productController.getCategories);
router.get('/low-stock', requireRole('ADMIN', 'ACCOUNTANT', 'SALES'), productController.getLowStock);
router.get('/:id', validate({ params: idParam }), productController.getById);
router.post('/', requireRole('ADMIN', 'ACCOUNTANT'), validate({ body: createProductSchema }), productController.create);
router.patch('/:id', requireRole('ADMIN', 'ACCOUNTANT'), validate({ params: idParam, body: updateProductSchema }), productController.update);
router.delete('/:id', requireRole('ADMIN'), validate({ params: idParam }), productController.remove);
router.post('/:id/stock', requireRole('ADMIN', 'ACCOUNTANT'), validate({ params: idParam, body: stockSchema }), productController.adjustStock);
router.get('/:id/inventory-logs', validate({ params: idParam, query: productQuery.pick({ page: true, limit: true }) }), productController.getInventoryLogs);

export default router;
