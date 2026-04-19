import { Router } from 'express';
import { z } from 'zod';
import * as customerController from '../controllers/customer.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validation.js';

const router = Router();
const idParam = z.object({ id: z.string().min(1) });

const customerQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().max(120).optional(),
  optInWhatsApp: z.enum(['true', 'false']).optional(),
}).strict();

const customerBase = {
  name: z.string().min(2).max(160),
  phone: z.string().min(5).max(40),
  email: z.string().email().max(255).optional().nullable(),
  deviceModel: z.string().max(120).optional().nullable(),
  tags: z.array(z.string().max(60)).optional(),
  optInWhatsApp: z.boolean().optional(),
  optInEmail: z.boolean().optional(),
  referrerId: z.string().min(1).optional().nullable(),
};

router.use(authenticate);
router.get('/', validate({ query: customerQuery }), customerController.list);
router.get('/:id', validate({ params: idParam }), customerController.getById);
router.post('/', requireRole('ADMIN', 'SALES', 'MARKETING'), validate({ body: z.object(customerBase).strict() }), customerController.create);
router.patch('/:id', requireRole('ADMIN', 'SALES', 'MARKETING'), validate({ params: idParam, body: z.object({ ...customerBase, loyaltyPoints: z.coerce.number().int().min(0).optional() }).partial().strict() }), customerController.update);
router.delete('/:id', requireRole('ADMIN', 'MARKETING'), validate({ params: idParam }), customerController.remove);

export default router;
