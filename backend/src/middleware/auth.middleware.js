import AppError from '../utils/AppError.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * REST authentication guard. Extracts the Bearer token, verifies it, and attaches a minimal
 * `req.user` ({ id, email }) for downstream services to authorize against. Authentication
 * only — it answers "who are you", not "may you do this" (that's the service layer's job).
 */
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(AppError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired token'));
  }
}
