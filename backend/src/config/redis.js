import config from './index.js';

/**
 * Local-dev escape hatch: when USE_MOCK_REDIS=true (set by `npm run dev:local`), swap the real
 * ioredis driver for an in-process mock so the app runs with NO external Redis. Pub/sub
 * round-trips within the process, which is exactly right for a single local instance. In every
 * other environment this branch is skipped and the genuine ioredis client is used.
 */
const { Redis } =
  process.env.USE_MOCK_REDIS === 'true'
    ? { Redis: (await import('ioredis-mock')).default }
    : await import('ioredis');

/**
 * The Socket.IO Redis adapter needs TWO dedicated connections — one to publish, one to
 * subscribe — because a Redis connection in subscriber mode can't issue normal commands.
 * We also expose a general-purpose `cache` client for token/session caching.
 *
 * `lazyConnect: true` lets us call `.connect()` explicitly in server.js so startup order
 * is deterministic and connection failures surface at boot, not mid-request.
 */
const baseOptions = {
  lazyConnect: true,
  maxRetriesPerRequest: null, // required by the Socket.IO adapter's blocking ops
  retryStrategy: (times) => Math.min(times * 200, 2000),
};

export const pubClient = new Redis(config.redisUrl, baseOptions);
export const subClient = pubClient.duplicate();
export const cache = new Redis(config.redisUrl, baseOptions);

for (const [name, client] of [
  ['pub', pubClient],
  ['sub', subClient],
  ['cache', cache],
]) {
  client.on('error', (err) => console.error(`Redis[${name}] error:`, err.message));
}

export async function connectRedis() {
  await Promise.all([pubClient.connect(), subClient.connect(), cache.connect()]);
  console.log('✅ Redis connected (pub/sub + cache)');
}

export async function disconnectRedis() {
  await Promise.all([pubClient.quit(), subClient.quit(), cache.quit()]);
}
