import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Validate environment at boot. We parse process.env through a Zod schema so the
 * app *fails fast* with a clear message if a required variable is missing or malformed,
 * instead of crashing deep inside a request later. Everything downstream imports this
 * frozen `config` object — no module reads process.env directly (no hardcoded values).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

const config = Object.freeze({
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  port: env.PORT,
  // CORS_ORIGIN may be a comma-separated list; normalize to an array of trimmed origins.
  corsOrigins: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  mongoUri: env.MONGO_URI,
  redisUrl: env.REDIS_URL,
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
});

export default config;
