import { Router } from 'express';

import { PERMISSIONS } from '@andon/shared';

import { checkDatabaseConnection } from '../config/db';
import { env } from '../config/env';
import { asyncHandler } from '../lib/async-handler';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { authRouter } from '../modules/auth/auth.routes';
import { masterdataRouter } from '../modules/masterdata/masterdata.routes';

/**
 * Main API router — **coordinated file** (see docs/collaboration.md).
 *
 * Member 1 (auth + masterdata) mounts its routers here first. The remaining
 * modules are added by their owners, they must not reorder or rewrite this
 * file beyond adding their own `xxxRouter.use('/path', xxxRouter)` line:
 *
 *   member 2 -> workOrderRouter   -> /api/work-orders
 *               productionRouter   -> /api/production
 *   member 3 -> oeeRouter         -> /api/oee
 *   member 4 -> analyticsRouter   -> /api/analytics
 */
export const apiRouter = Router();

/** Liveness + readiness, no authentication required. */
apiRouter.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'andon-oee-backend',
      environment: env.NODE_ENV,
      contractVersion: process.env.npm_package_version ?? '0.1.0',
      uptimeSeconds: Math.round(process.uptime()),
      database: env.DATABASE_URL ? 'configured' : 'not-configured',
      mqtt: env.MQTT_ENABLED ? 'enabled' : 'disabled',
      websocket: env.WEBSOCKET_ENABLED ? 'enabled' : 'disabled',
    },
  });
});

apiRouter.get(
  '/health/ready',
  asyncHandler(async (_req, res) => {
    const database = (await checkDatabaseConnection()) ? 'up' : 'down';
    res.status(database === 'up' ? 200 : 503).json({
      success: database === 'up',
      data: { status: database === 'up' ? 'ready' : 'degraded', database },
    });
  }),
);

apiRouter.use('/auth', authRouter);
apiRouter.use(masterdataRouter);

/**
 * Temporary placeholder so member 3 can see the intended contract without any
 * module guessing. Remove this block once the real routers exist.
 */
apiRouter.get('/module-owners', authenticate, requirePermission(PERMISSIONS.MASTERDATA_READ), (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      implemented: ['auth', 'masterdata'],
      planned: {
        'workorder': 'member 2 - /api/work-orders',
        production: 'member 2 - /api/production',
        oee: 'member 3 - /api/oee',
        analytics: 'member 4 - /api/analytics',
      },
    },
  });
});