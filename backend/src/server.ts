import type { Server } from 'node:http';

import { createApp } from './app';
import { checkDatabaseConnection, closeDatabase } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { startMqttConsumer, stopMqttConsumer } from './mqtt';
import { startWebSocketGateway, stopWebSocketGateway } from './websocket';

/**
 * Process entry point: HTTP server + MQTT consumer + WebSocket gateway.
 * MQTT and WebSocket are feature flagged so members 2-4 can develop their
 * modules without the broker running.
 */
async function bootstrap(): Promise<void> {
  const app = createApp();

  const server: Server = app.listen(env.PORT, env.HOST, () => {
    logger.info(
      { port: env.PORT, host: env.HOST, env: env.NODE_ENV },
      `Andon OEE API listening on http://${env.HOST}:${env.PORT}`,
    );
    if (env.jwtIsDevelopmentFallback && !env.isTest) {
      logger.warn('JWT_SECRET is not set - using the development fallback secret.');
    }
  });

  const databaseUp = await checkDatabaseConnection();
  if (!databaseUp) {
    logger.warn(
      'Database is not reachable. Set DATABASE_URL in backend/.env, then run `npm run db:schema`.',
    );
  }

  if (env.MQTT_ENABLED) {
    startMqttConsumer();
  } else {
    logger.info('MQTT consumer disabled (MQTT_ENABLED=false)');
  }

  if (env.WEBSOCKET_ENABLED) {
    startWebSocketGateway(server);
  } else {
    logger.info('WebSocket gateway disabled (WEBSOCKET_ENABLED=false)');
  }

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');

    stopMqttConsumer();
    stopWebSocketGateway();

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeDatabase();

    logger.info('shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandled promise rejection');
  });
}

bootstrap().catch((error) => {
  logger.error({ err: error }, 'failed to start server');
  process.exit(1);
});