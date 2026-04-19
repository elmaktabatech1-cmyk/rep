import { ZodError } from 'zod';
import { AppError } from '../utils/helpers.js';

export const validate = (schemas) => async (req, res, next) => {
  try {
    if (schemas.body) req.body = await schemas.body.parseAsync(req.body);
    if (schemas.query) req.query = await schemas.query.parseAsync(req.query);
    if (schemas.params) req.params = await schemas.params.parseAsync(req.params);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map((e) => ({ field: e.path.join('.'), message: e.message, code: e.code }));
      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', details));
    }
    next(err);
  }
};

export const validateBody = (schema) => validate({ body: schema });
export const validateQuery = (schema) => validate({ query: schema });
