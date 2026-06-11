/**
 * Zero-install local runner.
 *
 * Boots an in-memory MongoDB (downloaded once into a local cache) and flips on the in-process
 * Redis mock, then starts the REAL server unchanged. Lets you run the full app — REST + live
 * WebSockets — with no Docker, no MongoDB install, and no Redis install.
 *
 *   npm run dev:local
 *
 * Production / normal dev (`npm run dev` / `npm start`) is untouched and still uses real
 * MongoDB + Redis from .env.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongo = await MongoMemoryServer.create();

// These must be set BEFORE the server imports its config (dotenv won't override an existing
// process.env var, so ours win over .env).
process.env.MONGO_URI = mongo.getUri('pms');
process.env.USE_MOCK_REDIS = 'true';

console.log(`🧪 In-memory MongoDB ready at ${process.env.MONGO_URI}`);
console.log('🧪 Redis: in-process mock (USE_MOCK_REDIS=true)');

// Hand off to the real entry point with infra now provisioned.
await import('./server.js');

const cleanup = async () => {
  await mongo.stop();
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
