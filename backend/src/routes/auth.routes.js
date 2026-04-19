import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { adminOnly, adminOrSelf } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const roleEnum = z.enum(['ADMIN', 'SALES', 'ACCOUNTANT', 'MARKETING']);
const idParam = z.object({ id: z.string().min(1) });

const loginSchema = z.object({
  email: z.string().email().max(255).transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8).max(128),
});

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(255).transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8).max(128),
  role: roleEnum.default('SALES'),
  phone: z.string().max(40).optional().nullable(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().max(40).nullable().optional(),
  role: roleEnum.optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(128).optional(),
}).strict();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
}).strict();

const listUsersQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().max(120).optional(),
  role: roleEnum.optional(),
}).strict();

router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', authLimiter, authController.refresh);
router.get('/me', authenticate, authController.getMe);
router.post('/register', authenticate, adminOnly, validate({ body: registerSchema }), authController.register);
router.get('/users', authenticate, adminOnly, validate({ query: listUsersQuery }), authController.listUsers);
router.patch('/users/:id', authenticate, adminOrSelf('id'), validate({ params: idParam, body: updateUserSchema }), authController.updateUser);
router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), authController.changePassword);

export default router;
