import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;
    if (!token) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') throw new AppError('Access token expired', 401, 'TOKEN_EXPIRED');
      throw new AppError('Invalid access token', 401, 'INVALID_TOKEN');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true, name: true },
    });

    if (!user || !user.isActive) throw new AppError('User not found or deactivated', 401, 'USER_INACTIVE');

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    logger.error('Auth middleware error', { message: error.message });
    next(new AppError('Authentication failed', 401, 'AUTH_FAILED'));
  }
};

export const verifyRefreshToken = (token) => {
  try { return jwt.verify(token, process.env.JWT_REFRESH_SECRET); }
  catch { return null; }
};

export const generateTokens = (userId, role) => {
  const accessToken = jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '15m', issuer: 'erp-system' });
  const refreshToken = jwt.sign({ userId, role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d', issuer: 'erp-system' });
  return { accessToken, refreshToken };
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  const base = { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/' };
  res.cookie('accessToken', accessToken, { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/v1/auth/refresh' });
};

export const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', { httpOnly: true, path: '/' });
  res.clearCookie('refreshToken', { httpOnly: true, path: '/api/v1/auth/refresh' });
};
