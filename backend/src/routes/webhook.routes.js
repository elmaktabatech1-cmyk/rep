import { Router } from 'express';
import { z } from 'zod';
import * as webhookController from '../controllers/webhook.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validation.js';
import { webhookLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const logQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  source: z.string().max(80).optional(),
  status: z.string().max(80).optional(),
}).strict();

router.post('/woocommerce', webhookLimiter, webhookController.woocommerce);
router.get('/logs', authenticate, requireRole('ADMIN'), validate({ query: logQuery }), webhookController.logs);

export default router;
