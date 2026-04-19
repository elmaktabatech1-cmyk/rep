import { logger } from '../utils/logger.js';
import { AppError } from '../utils/helpers.js';

const normalizeError = (err) => {
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return new AppError(`${field} already exists`, 409, 'DUPLICATE_ENTRY');
  }
  if (err.code === 'P2025') return new AppError('Record not found', 404, 'NOT_FOUND');
  if (err.code === 'P2003') return new AppError('Related record not found', 400, 'FOREIGN_KEY_ERROR');
  if (err.name === 'JsonWebTokenError') return new AppError('Invalid token', 401, 'INVALID_TOKEN');
  if (err.name === 'TokenExpiredError') return new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  if (err.code === 'LIMIT_FILE_SIZE') return new AppError(`File too large. Max: ${process.env.MAX_FILE_SIZE_MB || 5}MB`, 413, 'FILE_TOO_LARGE');
  return err;
};

export const errorHandler = (err, req, res, next) => {
  const normalized = normalizeError(err);
  const statusCode = normalized.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const isOperational = normalized.isOperational === true;

  if (statusCode >= 500) {
    logger.error('Server error', { message: normalized.message, code: normalized.code, path: req.path, method: req.method });
  } else {
    logger.warn('Client error', { message: normalized.message, code: normalized.code, path: req.path });
  }

  const response = {
    success: false,
    code: normalized.code || 'INTERNAL_ERROR',
    message: isOperational || !isProd ? normalized.message : 'An unexpected error occurred',
  };

  if (normalized.details && (isOperational || !isProd)) response.details = normalized.details;
  if (!isProd && normalized.stack) response.stack = normalized.stack;

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req, res, next) =>
  next(new AppError(`Route ${req.method} ${req.path} not found`, 404, 'NOT_FOUND'));
