import { permissionsForRole, type RoleCode } from '@andon/shared';

import { signAccessToken } from '../../src/middleware/auth';

/** Creates a real access token so tests exercise the genuine auth middleware. */
export function tokenFor(role: RoleCode, userId = `user-${role.toLowerCase()}`): string {
  return signAccessToken({
    sub: userId,
    email: `${role.toLowerCase()}@example.com`,
    role,
    permissions: permissionsForRole(role),
  });
}

export const adminToken = (): string => tokenFor('ADMIN');
export const supervisorToken = (): string => tokenFor('SUPERVISOR');
export const operatorToken = (): string => tokenFor('OPERATOR');