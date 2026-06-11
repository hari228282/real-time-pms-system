import http from 'node:http';

import app from './src/app.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import config from './src/config/index.js';
import { connectRedis, disconnectRedis } from './src/config/redis.js';
import { initSocket } from './src/sockets/index.js';

/**
 * Process entry point. Startup order matters: connect infrastructure (Mongo + Redis) FIRST,
 * then attach Socket.IO (which needs the Redis adapter clients), then start listening. We
 * never accept traffic before the dependencies are live.
 */
async function start() {
  await connectDB();
  await connectRedis();

  const server = http.createServer(app);
  initSocket(server); // shares the same HTTP server as Express

  server.listen(config.port, () => {
    console.log(`🚀 API + WebSocket listening on :${config.port} (${config.env})`);
  });

  setupGracefulShutdown(server);
}

/** Drain connections and close infra cleanly so we don't drop sockets or leak handles. */
function setupGracefulShutdown(server) {
  const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down...`);
    server.close();
    await Promise.allSettled([disconnectDB(), disconnectRedis()]);
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
