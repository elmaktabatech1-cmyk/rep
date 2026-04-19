import { Router } from 'express';
import { z } from 'zod';
import * as campaignController from '../controllers/campaign.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validation.js';

const router = Router();
const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
}).strict();

const filtersSchema = z.record(z.unknown()).default({});

const campaignSchema = z.object({
  name: z.string().min(2).max(160),
  channel: z.enum(['WHATSAPP', 'EMAIL']),
  segmentId: z.string().min(1).optional().nullable(),
  targetSegment: z.record(z.unknown()).optional().nullable(),
  channelConfig: z.record(z.unknown()).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
}).strict();

const segmentSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  filters: filtersSchema,
}).strict();

router.use(authenticate, requireRole('ADMIN', 'MARKETING'));
router.get('/', validate({ query: listQuery }), campaignController.listCampaigns);
router.post('/', validate({ body: campaignSchema }), campaignController.createCampaign);
router.get('/segments', campaignController.listSegmentsCtrl);
router.post('/segments', validate({ body: segmentSchema }), campaignController.createSegmentCtrl);
router.patch('/segments/:id', validate({ params: idParam, body: segmentSchema.partial().strict() }), campaignController.updateSegmentCtrl);
router.post('/segments/preview', validate({ body: z.object({ filters: filtersSchema }).strict() }), campaignController.previewSegment);
router.get('/:id', validate({ params: idParam }), campaignController.getCampaignById);
router.post('/:id/send', validate({ params: idParam }), campaignController.sendCampaign);

export default router;
