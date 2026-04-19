import { prisma } from '../config/database.js';
import * as segmentService from '../services/segmentResolver.service.js';
import { sendBulkMessages } from '../services/whatsapp.service.js';
import { AppError, sendSuccess, sendCreated, getPagination, buildPaginationMeta } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

export const listCampaigns = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' }, include: { segment: { select: { id: true, name: true, customerCount: true } } } }),
      prisma.campaign.count(),
    ]);
    res.json({ success: true, campaigns, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

export const getCampaignById = async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id }, include: { segment: true, messageLogs: { orderBy: { sentAt: 'desc' }, take: 50 } } });
    if (!campaign) throw new AppError('Campaign not found', 404, 'NOT_FOUND');
    sendSuccess(res, { campaign });
  } catch (err) { next(err); }
};

export const createCampaign = async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.create({
      data: { name: req.body.name, channel: req.body.channel, segmentId: req.body.segmentId || null, targetSegment: req.body.targetSegment || null, status: 'DRAFT', channelConfig: req.body.channelConfig || null, scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : null },
    });
    sendCreated(res, { campaign }, 'Campaign created');
  } catch (err) { next(err); }
};

export const sendCampaign = async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) throw new AppError('Campaign not found', 404, 'NOT_FOUND');
    if (campaign.status === 'SENT') throw new AppError('Campaign already sent', 400, 'ALREADY_SENT');

    let customers = [];
    if (campaign.segmentId) {
      const segment = await prisma.segment.findUnique({ where: { id: campaign.segmentId } });
      if (segment) customers = await segmentService.resolveSegmentCustomers(segment.filters);
    } else if (campaign.targetSegment) {
      customers = await segmentService.resolveSegmentCustomers(campaign.targetSegment);
    }

    if (!customers.length) throw new AppError('No eligible customers in segment', 400, 'EMPTY_SEGMENT');

    const result = await sendBulkMessages(campaign, customers);
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'SENT', sentCount: result.sentCount, sentAt: new Date() } });

    logger.info('Campaign sent', { campaignId: campaign.id, sentCount: result.sentCount });
    sendSuccess(res, { sentCount: result.sentCount, total: customers.length }, 'Campaign sent');
  } catch (err) { next(err); }
};

export const listSegmentsCtrl = async (req, res, next) => {
  try { sendSuccess(res, { segments: await segmentService.listSegments() }); } catch (err) { next(err); }
};

export const createSegmentCtrl = async (req, res, next) => {
  try { sendCreated(res, { segment: await segmentService.createSegment(req.body) }, 'Segment created'); } catch (err) { next(err); }
};

export const updateSegmentCtrl = async (req, res, next) => {
  try { sendSuccess(res, { segment: await segmentService.updateSegment(req.params.id, req.body) }, 'Segment updated'); } catch (err) { next(err); }
};

export const previewSegment = async (req, res, next) => {
  try {
    const customers = await segmentService.resolveSegmentCustomers(req.body.filters || {});
    sendSuccess(res, { count: customers.length, sample: customers.slice(0, 5).map((c) => ({ id: c.id, name: c.name })) });
  } catch (err) { next(err); }
};
