import { validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

export default function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return next(
      new AppError('Validation failed. Check the supplied fields.', 400, result.array())
    );
  }
  next();
}
