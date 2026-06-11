import { ZodError } from 'zod';

import config from '../config/index.js';
import AppError from '../utils/AppError.js';

/**
 * Terminal error middleware — the ONE place errors become HTTP responses. Anything thrown
 * in a service or controller (via catchAsync) lands here. We normalize the common failure
 * types (Zod, Mongoose cast/duplicate, our AppError) into the standard error envelope.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity (4 args)
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    return res.status(statusCode).json({
      success: false,
      error: { code, message, details: err.flatten().fieldErrors },
    });
  }

  // Mongoose: malformed ObjectId in a route param
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    code = 'INVALID_ID';
  }

  // Mongoose: unique index violation (e.g. duplicate email)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already exists`;
    code = 'DUPLICATE_KEY';
  }

  // Never leak internals on unexpected (non-operational) errors in production.
  const isUnexpected = !(err instanceof AppError) && statusCode === 500;
  if (isUnexpected) {
    console.error('💥 Unexpected error:', err);
    if (config.isProd) message = 'Internal server error';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: code || 'ERROR',
      message,
      ...(config.isProd ? {} : { stack: err.stack }),
    },
  });
}

/** 404 fallthrough for unmatched routes. */
export function notFoundHandler(req, _res, next) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}
