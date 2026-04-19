const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '/': '&#x2F;' };

export const escapeHtml = (str) =>
  typeof str === 'string' ? str.replace(/[&<>"'/]/g, (c) => HTML_ENTITIES[c]) : str;

export const stripHtml = (str) =>
  typeof str === 'string' ? str.replace(/<[^>]*>/g, '').trim() : str;

export const sanitizeString = (str, opts = {}) => {
  if (typeof str !== 'string') return str;
  let result = str.trim();
  if (opts.stripHtml !== false) result = stripHtml(result);
  if (opts.maxLength) result = result.slice(0, opts.maxLength);
  return result;
};

export const sanitizePhone = (phone) => {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.length < 7 ? null : cleaned;
};

export const sanitizeEmail = (email) => email ? email.toLowerCase().trim() : null;

export const sanitizeObject = (obj, depth = 0) => {
  if (depth > 5) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map((item) => sanitizeObject(item, depth + 1));
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, sanitizeObject(v, depth + 1)]));
  }
  return obj;
};

export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') req.body = sanitizeObject(req.body);
  next();
};
