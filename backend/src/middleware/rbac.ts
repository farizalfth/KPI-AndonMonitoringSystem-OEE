import type { NextFunction, Request, Response } from 'express';

import type { Permission, RoleCode } from '@andon/shared';

import { forbidden, unauthenticated } from '../lib/errors';

/** Requires the authenticated user to hold at least one of the permissions. */
export function requirePermission(...required: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(unauthenticated());
      return;
    }

    const granted = req.auth.permissions ?? [];
    const allowed = required.some((permission) => granted.includes(permission));

    if (!allowed) {
      next(forbidden(`Missing permission: ${required.join(' or ')}`));
      return;
    }

    next();
  };
}

/** Requires one of the given roles. Useful for narrow, role specific rules. */
export function requireRole(...roles: RoleCode[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(unauthenticated());
      return;
    }

    if (!roles.includes(req.auth.role)) {
      next(forbidden(`Requires role: ${roles.join(' or ')}`));
      return;
    }

    next();
  };
}