import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';

import config from '../config/index.js';
import { pubClient, subClient } from '../config/redis.js';

import { setIO } from './realtime.js';
import { socketAuth } from './socketAuth.js';
import { registerTaskHandlers } from './taskHandlers.js';

/**
 * Build and wire the Socket.IO server onto the shared HTTP server.
 *
 * The Redis adapter is the key to horizontal scaling: with multiple backend instances behind
 * Nginx, two users on the same project may be connected to DIFFERENT instances. A plain
 * in-process emit only reaches local sockets. The adapter publishes every room emit over
 * Redis pub/sub so EVERY instance delivers it to its local members — making fan-out correct
 * under a load balancer.
 */
export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigins, credentials: true },
  });

  io.adapter(createAdapter(pubClient, subClient));

  // Handshake JWT auth — rejects unauthenticated connections before any handler runs.
  io.use(socketAuth);

  io.on('connection', (socket) => {
    console.log(`🔌 socket connected: ${socket.id} (user ${socket.user.id})`);
    registerTaskHandlers(io, socket);
  });

  // Expose io to the REST side so controllers can broadcast after persisting.
  setIO(io);

  return io;
}
