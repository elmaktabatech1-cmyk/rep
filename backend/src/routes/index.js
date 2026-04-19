import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import customerRoutes from './customer.routes.js';
import orderRoutes from './order.routes.js';
import expenseRoutes from './expense.routes.js';
import reportRoutes from './report.routes.js';
import campaignRoutes from './campaign.routes.js';
import aiRoutes from './ai.routes.js';
import webhookRoutes from './webhook.routes.js';
import { sendSuccess } from '../utils/helpers.js';

const router = Router();

router.get('/health', (req, res) => {
  sendSuccess(res, {
    service: 'erp-system-api',
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reports', reportRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/ai', aiRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
