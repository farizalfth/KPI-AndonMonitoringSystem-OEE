import bcrypt from 'bcryptjs';

import type { AuthenticatedUser, LoginResponse } from '@andon/shared';
import { permissionsForRole, type RoleCode } from '@andon/shared';

import { env } from '../../config/env';
import { invalidCredentials, notFound } from '../../lib/errors';
import { signAccessToken } from '../../middleware/auth';
import {
  findUserById,
  findUserCredentialsByEmail,
  touchLastLogin,
} from '../../models/user.model';

/**
 * Authentication service (member 1).
 *
 * Login: verify bcrypt hash -> build the JWT -> remember last login.
 * The role of a user is resolved from `roles.base_role` when present, which is
 * what makes custom roles work without touching the permission matrix code.
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const credentials = await findUserCredentialsByEmail(email);

  if (!credentials) {
    // Constant-ish work factor so a missing user is not distinguishable by timing.
    await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu');
    throw invalidCredentials();
  }

  const passwordHash = String(credentials.passwordHash ?? '');
  const isActive = credentials.isActive === true;
  const matches = await bcrypt.compare(password, passwordHash);

  if (!matches || !isActive) {
    throw invalidCredentials();
  }

  const roleCode = (credentials.baseRole ?? credentials.roleCode) as RoleCode;
  const permissions = permissionsForRole(roleCode);

  await touchLastLogin(String(credentials.id));

  const accessToken = signAccessToken({
    sub: String(credentials.id),
    email: String(credentials.email),
    role: roleCode,
    permissions,
  });

  const user = await findUserById(String(credentials.id));
  if (!user) throw notFound('User', String(credentials.id));

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: parseExpiresInSeconds(env.JWT_EXPIRES_IN),
    user: { ...user, permissions },
  };
}

/**
 * `GET /api/auth/me`: the session owner with the permissions of the current
 * role, so a client can rebuild its navigation after a reload.
 */
export async function getAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
  const user = await findUserById(userId);
  if (!user) throw notFound('User', userId);
  return { ...user, permissions: permissionsForRole(user.roleCode) };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Converts `8h` / `30m` / `3600` style durations into seconds. */
export function parseExpiresInSeconds(value: string): number {
  if (/^\d+$/.test(value)) return Number(value);

  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return 8 * 60 * 60;

  const amount = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
  return amount * multiplier;
}