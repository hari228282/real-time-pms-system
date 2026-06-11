import AppError from '../utils/AppError.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Socket.IO handshake authentication — the WebSocket equivalent of requireAuth. Registered
 * via io.use(), it runs ONCE per connection before any event is wired. An unauthenticated
 * handshake is rejected here, so the rest of the socket code can assume socket.user exists.
 *
 * The token is read from handshake.auth.token (set by the client when constructing the
 * socket), not from a header — that's the Socket.IO-native place for connection credentials.
 */
export function socketAuth(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) return next(AppError.unauthorized('Socket auth token missing'));

    const payload = verifyToken(token);
    socket.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(AppError.unauthorized('Invalid socket token'));
  }
}
