// ─── Custom Error Class ────────────────────────────────────────────────────────
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Response Helpers ──────────────────────────────────────────────────────────
export const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

export const sendCreated = (res, data = null, message = 'Created successfully') =>
  sendSuccess(res, data, message, 201);

export const sendPaginated = (res, data, pagination) =>
  res.status(200).json({ success: true, data, pagination });

// ─── Pagination ────────────────────────────────────────────────────────────────
export const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

// ─── Invoice Number ────────────────────────────────────────────────────────────
export const generateInvoiceNumber = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${y}${m}-${r}`;
};

// ─── Date Helpers ──────────────────────────────────────────────────────────────
export const getDateRangeFilter = (from, to) => {
  const filter = {};
  if (from) filter.gte = new Date(from);
  if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); filter.lte = d; }
  return Object.keys(filter).length ? filter : undefined;
};

export const formatMonth = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

// ─── Number Helpers ────────────────────────────────────────────────────────────
export const toDecimal = (value) => parseFloat(value || 0);

export const formatCurrency = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(toDecimal(amount));

// ─── String Helpers ────────────────────────────────────────────────────────────
export const generateRandomCode = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const maskPhone = (phone) => phone ? phone.replace(/(\d{3})\d+(\d{2})/, '$1****$2') : null;
export const maskEmail = (email) => {
  if (!email) return null;
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
};

// ─── Async ────────────────────────────────────────────────────────────────────
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
