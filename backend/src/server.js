import './config/env.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import apiRoutes from './routes/index.js';
import { applySecurityHeaders } from './middleware/securityHeaders.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.set('trust proxy', 1);
applySecurityHeaders(app);
app.use(globalLimiter);

app.use('/api/v1/webhooks/woocommerce', express.raw({
  type: '*/*',
  limit: '2mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}), (req, res, next) => {
  try {
    req.body = req.rawBody ? JSON.parse(req.rawBody) : {};
    next();
  } catch {
    res.status(400).json({ success: false, code: 'INVALID_JSON', message: 'Invalid webhook payload' });
  }
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

app.use('/api/v1', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

let server;

const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully.`);
  if (server) {
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  } else {
    await disconnectDatabase();
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { message: reason?.message || String(reason) });
});

await connectDatabase();
server = app.listen(port, () => {
  logger.info(`ERP API listening on port ${port}`);
});

export default app;
