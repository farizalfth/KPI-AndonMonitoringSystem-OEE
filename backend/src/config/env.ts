import path from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Environment configuration.
 *
 * Loading order:
 *   1. real process environment (highest priority)
 *   2. backend/.env
 *   3. repository root .env (convenience for Neon users)
 *
 * The schema validates everything once at import time, so a typo in a variable
 * fails fast with an actionable message instead of surfacing as a 500 later.
 */

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const DEV_JWT_SECRET = 'dev-only-insecure-secret-change-me-0123456789abcdef';

const booleanFromString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().min(1).default('0.0.0.0'),

  DATABASE_URL: z.string().min(1).optional(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_SSL: booleanFromString.default('false'),

  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().min(2).default('8h'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  MQTT_ENABLED: booleanFromString.default('false'),
  MQTT_URL: z.string().default('mqtt://localhost:1883'),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
  MQTT_TOPIC_ROOT: z.string().default('production/machine'),

  WEBSOCKET_ENABLED: booleanFromString.default('false'),

  LOG_LEVEL: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

const raw = parsed.data;

const isProduction = raw.NODE_ENV === 'production';
const jwtSecret = raw.JWT_SECRET ?? DEV_JWT_SECRET;

if (isProduction && !raw.JWT_SECRET) {
  throw new Error('JWT_SECRET is required when NODE_ENV=production (min 32 characters).');
}

if (!raw.DATABASE_URL && !isProduction) {
   
  console.warn(
    '[env] DATABASE_URL is not set. Database backed routes will fail until it is configured ' +
      '(see backend/.env.example).',
  );
}

export const env = {
  ...raw,
  isProduction,
  isTest: raw.NODE_ENV === 'test',
  jwtSecret,
  jwtIsDevelopmentFallback: !raw.JWT_SECRET,
  corsOrigins: raw.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;

export type Env = typeof env;