import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { generateTokens, verifyRefreshToken } from '../middleware/auth.js';
import { AppError, getPagination, buildPaginationMeta } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

const SALT_ROUNDS = 12;

export const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, email: true, name: true, role: true, passwordHash: true, isActive: true },
  });
  if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  if (!user.isActive) throw new AppError('Account deactivated. Contact administrator.', 403, 'ACCOUNT_INACTIVE');

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  logger.info('User logged in', { userId: user.id, role: user.role });

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  };
};

export const refreshAccessToken = async (token) => {
  if (!token) throw new AppError('Refresh token required', 401, 'UNAUTHORIZED');
  const payload = verifyRefreshToken(token);
  if (!payload) throw new AppError('Invalid or expired refresh token', 401, 'INVALID_TOKEN');

  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, role: true, isActive: true } });
  if (!user || !user.isActive) throw new AppError('User not found or inactive', 401, 'USER_INACTIVE');

  return generateTokens(user.id, user.role);
};

export const registerUser = async (data) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) throw new AppError('Email already registered', 409, 'DUPLICATE_ENTRY');

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role || 'SALES',
      phone: data.phone || null,
      isActive: true,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  logger.info('New user registered', { userId: user.id, role: user.role });
  return user;
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, passwordHash: true } });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new AppError('Current password is incorrect', 400, 'INVALID_CREDENTIALS');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  logger.info('Password changed', { userId });
};

export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, lastLogin: true, createdAt: true },
  });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  return user;
};

export const listUsers = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const where = {};
  if (query.search) where.OR = [{ name: { contains: query.search } }, { email: { contains: query.search } }];
  if (query.role) where.role = query.role;

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, lastLogin: true, createdAt: true } }),
    prisma.user.count({ where }),
  ]);
  return { users, pagination: buildPaginationMeta(total, page, limit) };
};

export const updateUser = async (userId, data) => {
  const updateData = {};
  if (data.name) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.role) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
  });
};
