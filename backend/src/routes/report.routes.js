import { Router } from 'express';
import { z } from 'zod';
import * as reportController from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validation.js';

const router = Router();

const rangeQuery = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
}).strict();

router.use(authenticate);
router.get('/sales', requireRole('ADMIN', 'ACCOUNTANT', 'SALES'), validate({ query: rangeQuery }), reportController.salesDashboard);
router.get('/inventory', requireRole('ADMIN', 'ACCOUNTANT', 'SALES'), reportController.inventoryReport);

export default router;
