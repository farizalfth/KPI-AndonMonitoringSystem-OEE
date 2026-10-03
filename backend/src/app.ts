import compression from 'compression';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { apiRouter } from './routes';

/**
 * Express application factory.
 *
 * Kept separate from `server.ts` so integration tests can mount the app with
 * supertest without opening a TCP port or starting MQTT/WebSocket.
 */
export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // The Andon board may be served from a different origin (e.g. a plant TV
      // dashboard) and the API only serves JSON.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header -> same-origin, curl, health probes.
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: false,
      exposedHeaders: ['Content-Length'],
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/api/health' || req.url === '/api/health/ready',
      },
      customLogLevel(_req, res, error) {
        if (error || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}