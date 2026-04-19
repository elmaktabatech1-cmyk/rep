import * as authService from '../services/auth.service.js';
import { setAuthCookies, clearAuthCookies } from '../middleware/auth.js';
import { sendSuccess, sendCreated } from '../utils/helpers.js';

export const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body.email, req.body.password);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    sendSuccess(res, { user: result.user }, 'Login successful');
  } catch (err) { next(err); }
};

export const logout = async (req, res, next) => {
  try { clearAuthCookies(res); sendSuccess(res, null, 'Logged out'); } catch (err) { next(err); }
};

export const refresh = async (req, res, next) => {
  try {
    const tokens = await authService.refreshAccessToken(req.cookies?.refreshToken);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    sendSuccess(res, null, 'Token refreshed');
  } catch (err) { next(err); }
};

export const getMe = async (req, res, next) => {
  try { sendSuccess(res, { user: await authService.getMe(req.user.id) }); } catch (err) { next(err); }
};

export const register = async (req, res, next) => {
  try { sendCreated(res, { user: await authService.registerUser(req.body) }, 'User registered'); } catch (err) { next(err); }
};

export const listUsers = async (req, res, next) => {
  try {
    const result = await authService.listUsers(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const updateUser = async (req, res, next) => {
  try { sendSuccess(res, { user: await authService.updateUser(req.params.id, req.body) }, 'User updated'); } catch (err) { next(err); }
};

export const changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    clearAuthCookies(res);
    sendSuccess(res, null, 'Password changed. Please log in again.');
  } catch (err) { next(err); }
};
