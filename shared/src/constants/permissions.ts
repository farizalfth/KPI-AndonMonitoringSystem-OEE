import type { RoleCode } from './enums.js';

/**
 * Permission strings. Format: `<resource>:<action>`.
 * The backend enforces these (see `requirePermission`), the frontend only uses
 * them to hide/disable UI elements.
 */
export const PERMISSIONS = {
  MASTERDATA_READ: 'masterdata:read',
  MASTERDATA_WRITE: 'masterdata:write',
  USERS_MANAGE: 'users:manage',
  WORKORDER_READ: 'workorder:read',
  WORKORDER_WRITE: 'workorder:write',
  WORKORDER_APPROVE: 'workorder:approve',
  PRODUCTION_EXECUTE: 'production:execute',
  ANDON_VIEW: 'andon:view',
  ANALYTICS_VIEW: 'analytics:view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const SUPERVISOR_PERMISSIONS: Permission[] = [
  PERMISSIONS.MASTERDATA_READ,
  PERMISSIONS.WORKORDER_READ,
  PERMISSIONS.WORKORDER_WRITE,
  PERMISSIONS.WORKORDER_APPROVE,
  PERMISSIONS.PRODUCTION_EXECUTE,
  PERMISSIONS.ANDON_VIEW,
  PERMISSIONS.ANALYTICS_VIEW,
];

const OPERATOR_PERMISSIONS: Permission[] = [
  PERMISSIONS.MASTERDATA_READ,
  PERMISSIONS.WORKORDER_READ,
  PERMISSIONS.PRODUCTION_EXECUTE,
  PERMISSIONS.ANDON_VIEW,
];

/**
 * Permission matrix. This is the authoritative role -> permission mapping for
 * both backend authorization and frontend menu visibility.
 */
export const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  ADMIN: Object.values(PERMISSIONS),
  SUPERVISOR: SUPERVISOR_PERMISSIONS,
  OPERATOR: OPERATOR_PERMISSIONS,
};

export function permissionsForRole(role: RoleCode): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: RoleCode, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}