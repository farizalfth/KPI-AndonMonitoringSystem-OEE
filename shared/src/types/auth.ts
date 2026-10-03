import type { Permission } from '../constants/permissions.js';
import type { RoleCode } from '../constants/enums.js';

/**
 * User as stored in `users` joined with `roles` (never exposes password_hash).
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  roleCode: RoleCode;
  roleName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A user plus the permissions the server resolved for the current role.
 * Returned by `POST /api/auth/login` and `GET /api/auth/me` so the frontend
 * never has to duplicate the permission matrix.
 */
export interface AuthenticatedUser extends User {
  permissions: Permission[];
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  roleId: string;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  roleId?: string;
  isActive?: boolean;
  password?: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  baseRole: RoleCode | null;
  isSystem: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string;
  baseRole?: RoleCode;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  baseRole?: RoleCode;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthenticatedUser;
}

/** Claims embedded in the JWT access token. */
export interface JwtPayload {
  sub: string;
  email: string;
  role: RoleCode;
  permissions: Permission[];
  iat?: number;
  exp?: number;
}