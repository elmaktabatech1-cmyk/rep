import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000;
const max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

const makeHandler = (msg) => (req, res) => {
  logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
  res.status(429).json({ success: false, code: 'RATE_LIMIT_EXCEEDED', message: msg });
};

export const globalLimiter = rateLimit({
  windowMs, max, standardHeaders: true, legacyHeaders: false,
  handler: makeHandler('Too many requests, please try again later.'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  handler: makeHandler('Too many authentication attempts. Wait 15 minutes.'),
});

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false,
  handler: makeHandler('Webhook rate limit exceeded.'),
});
