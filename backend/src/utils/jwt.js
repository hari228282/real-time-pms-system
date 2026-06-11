import jwt from 'jsonwebtoken';

import config from '../config/index.js';

/**
 * Centralized token sign/verify so REST middleware and the socket handshake share ONE
 * implementation — a token minted on login is verified identically whether it arrives in an
 * Authorization header or a socket handshake.
 */
export const signToken = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

export const verifyToken = (token) => jwt.verify(token, config.jwt.secret);
