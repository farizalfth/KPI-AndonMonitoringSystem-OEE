import pino, { type Logger } from 'pino';

import { env } from './env';

/**
 * Application logger.
 *
 * Development: pretty printed single line logs.
 * Production / test: structured JSON so log aggregators can index the fields.
 */
function createLogger(): Logger {
  const base = {
    level: env.LOG_LEVEL,
    base: { service: 'andon-oee-backend', env: env.NODE_ENV },
  };

  if (env.isProduction || env.isTest) {
    return pino(base);
  }

  return pino({
    ...base,
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service,env' },
    },
  });
}

export const logger = createLogger();

export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}