import { Router } from 'express';
import { z } from 'zod';
import * as aiController from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validation.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN', 'ACCOUNTANT', 'SALES', 'MARKETING'));
router.post('/query', validate({ body: z.object({ prompt: z.string().min(3).max(2000) }).strict() }), aiController.query);

export default router;
