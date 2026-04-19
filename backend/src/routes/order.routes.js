import { Router } from 'express';
import { z } from 'zod';
import * as orderController from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validation.js';

const router = Router();
const idParam = z.object({ id: z.string().min(1) });

const orderQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().max(120).optional(),
  status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'CANCELLED']).optional(),
  source: z.enum(['WOOCOMMERCE', 'MANUAL']).optional(),
  customerId: z.string().min(1).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
}).strict();

const itemSchema = z.object({
  productId: z.string().min(1).optional().nullable(),
  quantity: z.coerce.number().int().positive(),
  priceAtSale: z.coerce.number().nonnegative().optional(),
}).strict();

const createOrderSchema = z.object({
  externalOrderId: z.string().max(120).optional().nullable(),
  source: z.enum(['WOOCOMMERCE', 'MANUAL']).default('MANUAL'),
  customerId: z.string().min(1).optional().nullable(),
  channel: z.string().max(80).optional().nullable(),
  status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'CANCELLED']).default('PENDING'),
  paymentMethod: z.string().max(80).optional().nullable(),
  discount: z.coerce.number().nonnegative().default(0),
  tax: z.coerce.number().nonnegative().default(0),
  items: z.array(itemSchema).min(1),
}).strict();

const updateOrderSchema = z.object({
  channel: z.string().max(80).optional().nullable(),
  paymentMethod: z.string().max(80).optional().nullable(),
  discount: z.coerce.number().nonnegative().optional(),
  tax: z.coerce.number().nonnegative().optional(),
}).strict();

router.use(authenticate);
router.get('/stats', orderController.getStats);
router.get('/', validate({ query: orderQuery }), orderController.list);
router.get('/:id', validate({ params: idParam }), orderController.getById);
router.post('/', requireRole('ADMIN', 'SALES'), validate({ body: createOrderSchema }), orderController.create);
router.patch('/:id', requireRole('ADMIN', 'SALES'), validate({ params: idParam, body: updateOrderSchema }), orderController.update);
router.patch('/:id/status', requireRole('ADMIN', 'SALES', 'ACCOUNTANT'), validate({ params: idParam, body: z.object({ status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'CANCELLED']) }).strict() }), orderController.updateStatus);
router.get('/:id/invoice', validate({ params: idParam }), orderController.downloadInvoice);

export default router;
