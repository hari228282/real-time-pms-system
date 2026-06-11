/**
 * Operational errors we throw on purpose (bad input, not found, forbidden) — as opposed to
 * programmer bugs. `isOperational` lets the error middleware decide whether to expose the
 * message to the client (safe, expected) or hide it behind a generic 500 (unexpected).
 */
export default class AppError extends Error {
  constructor(statusCode, message, code = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code; // optional machine-readable code, e.g. 'EMAIL_TAKEN'
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg, code) {
    return new AppError(400, msg, code);
  }
  static unauthorized(msg = 'Unauthorized', code) {
    return new AppError(401, msg, code);
  }
  static forbidden(msg = 'Forbidden', code) {
    return new AppError(403, msg, code);
  }
  static notFound(msg = 'Not found', code) {
    return new AppError(404, msg, code);
  }
  static conflict(msg, code) {
    return new AppError(409, msg, code);
  }
}
