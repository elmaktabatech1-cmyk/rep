import { processAiQuery } from '../services/ai.service.js';
import { sendSuccess } from '../utils/helpers.js';

export const query = async (req, res, next) => {
  try { sendSuccess(res, await processAiQuery(req.body.prompt, req.user.id)); } catch (err) { next(err); }
};
