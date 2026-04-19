import { AppError } from '../utils/helpers.js';

const ROLE_HIERARCHY = ['MARKETING', 'SALES', 'ACCOUNTANT', 'ADMIN'];

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  if (!roles.includes(req.user.role)) return next(new AppError(`Access denied. Required: ${roles.join(', ')}`, 403, 'FORBIDDEN'));
  next();
};

export const requireMinRole = (minRole) => (req, res, next) => {
  if (!req.user) return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  const userLevel = ROLE_HIERARCHY.indexOf(req.user.role);
  const requiredLevel = ROLE_HIERARCHY.indexOf(minRole);
  if (userLevel < requiredLevel) return next(new AppError(`Minimum role required: ${minRole}`, 403, 'FORBIDDEN'));
  next();
};

export const adminOnly = requireRole('ADMIN');

export const adminOrSelf = (paramName = 'id') => (req, res, next) => {
  if (!req.user) return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  if (req.user.role === 'ADMIN' || req.params[paramName] === req.user.id) return next();
  next(new AppError('Access denied', 403, 'FORBIDDEN'));
};
