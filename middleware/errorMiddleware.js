import AppError from '../utils/AppError.js';
import { log } from '../utils/logger.js';

export function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.path}`, 404));
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let error = err;

  if (error.name === 'CastError') {
    error = new AppError('Invalid resource ID.', 400);
  } else if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((item) => item.message);
    error = new AppError('Database validation failed.', 400, messages);
  } else if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || 'field';
    error = new AppError(`A record with this ${field} already exists.`, 409);
  } else if (error.type === 'entity.parse.failed') {
    error = new AppError('Request body contains invalid JSON.', 400);
  } else if (error.type === 'entity.too.large') {
    error = new AppError('Request body is too large.', 413);
  }

  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    log('error', 'request_failed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode,
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  }

  const response = {
    success: false,
    message: statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Something went wrong on the server.'
      : error.message || 'Internal server error.',
    requestId: req.requestId
  };

  if (error.details) response.errors = error.details;
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
