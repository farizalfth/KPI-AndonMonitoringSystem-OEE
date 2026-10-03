import { Router } from 'express';

import { PERMISSIONS } from '@andon/shared';

import { asyncHandler } from '../../lib/async-handler';
import { idParamSchema } from '../../lib/validation';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { bindResource } from './masterdata.controller';
import { masterdataListQuerySchema } from './masterdata.schemas';
import { masterdataResources, type MasterdataResourceKey } from './masterdata.service';
import { userRouter } from './users/user.routes';

/**
 * Masterdata routes (member 1).
 *
 * Every resource is mounted with the same five endpoints:
 *   GET    /api/<resource>          list (paginated, searchable, sortable)
 *   POST   /api/<resource>          create
 *   GET    /api/<resource>/:id      detail
 *   PUT    /api/<resource>/:id      update
 *   DELETE /api/<resource>/:id      delete
 *
 * `users` is hand written (password hashing + role resolution) and is mounted
 * by `users/user.routes.ts` instead of the generic factory.
 */
export const masterdataRouter = Router();

// NB: `authenticate` is mounted *inside* every resource router (see
// `mountResource`), not on `masterdataRouter` itself. Mounting it here would
// also guard unmatched paths and turn every unknown route into a 401 instead
// of a 404.

masterdataRouter.use(
  '/users',
  authenticate,
  requirePermission(PERMISSIONS.USERS_MANAGE),
  userRouter,
);

for (const key of Object.keys(masterdataResources) as MasterdataResourceKey[]) {
  if (key === 'roles') {
    // Roles are readable by everyone who may read masterdata (the UI needs the
    // role list for the user form) but only ADMIN may modify them.
    mountResource(
      key,
      requirePermission(PERMISSIONS.MASTERDATA_READ),
      requirePermission(PERMISSIONS.MASTERDATA_WRITE),
    );
    continue;
  }

  mountResource(key, requirePermission(PERMISSIONS.MASTERDATA_READ), requirePermission(PERMISSIONS.MASTERDATA_WRITE));
}

function mountResource(
  key: MasterdataResourceKey,
  readGuard: ReturnType<typeof requirePermission>,
  writeGuard: ReturnType<typeof requirePermission>,
): void {
  const definition = masterdataResources[key];
  const handlers = bindResource(key);

  const router = Router();
  router.use(authenticate);
  router.get('/', readGuard, validate(masterdataListQuerySchema, 'query'), asyncHandler(handlers.list));
  router.post('/', writeGuard, validate(definition.createSchema), asyncHandler(handlers.create));
  router.get('/:id', readGuard, validate(idParamSchema, 'params'), asyncHandler(handlers.get));
  router.put(
    '/:id',
    writeGuard,
    validate(idParamSchema, 'params'),
    validate(definition.updateSchema),
    asyncHandler(handlers.update),
  );
  router.delete('/:id', writeGuard, validate(idParamSchema, 'params'), asyncHandler(handlers.remove));

  masterdataRouter.use(`/${definition.resource}`, router);
}