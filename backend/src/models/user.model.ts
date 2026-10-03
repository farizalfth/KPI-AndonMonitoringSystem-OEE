import type { CreateUserRequest, UpdateUserRequest, User } from '@andon/shared';

import { query, queryOne } from '../config/db';
import type { FilterValue, ListOptions, ListResult } from './repository';
import { buildMeta, normalisePageQuery } from '../lib/pagination';
import { notFound } from '../lib/errors';

/**
 * User model — hand written because of the password hash and the role join.
 * `password_hash` never leaves this module except as a bcrypt hash.
 */

type Row = Record<string, unknown>;

const SELECT_USER = `
  SELECT u.id            AS "id",
         u.email         AS "email",
         u.full_name     AS "fullName",
         u.role_id       AS "roleId",
         r.code          AS "roleCode",
         r.name          AS "roleName",
         u.is_active     AS "isActive",
         u.last_login_at AS "lastLoginAt",
         u.created_at    AS "createdAt",
         u.updated_at    AS "updatedAt"
    FROM users u
    JOIN roles r ON r.id = u.role_id`;

const SORTABLE: Record<string, string> = {
  email: 'u.email',
  fullName: 'u.full_name',
  roleCode: 'r.code',
  isActive: 'u.is_active',
  createdAt: 'u.created_at',
};

export async function listUsers(
  options: ListOptions = {},
): Promise<ListResult<User>> {
  const { page, limit, offset, search, sortBy, sortOrder } = normalisePageQuery(options);

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  const filters = (options.filters ?? {}) as Record<string, FilterValue>;
  if (filters.isActive !== undefined && filters.isActive !== null) {
    params.push(filters.isActive);
    conditions.push(`u.is_active = $${params.length}`);
  }
  if (filters.roleId) {
    params.push(filters.roleId);
    conditions.push(`u.role_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderColumn = (sortBy && SORTABLE[sortBy]) || 'u.full_name';

  const rows = await query<User>(
    `${SELECT_USER} ${where} ORDER BY ${orderColumn} ${sortOrder.toUpperCase()} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  const countRow = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count FROM users u ${where}`,
    [...params],
  );

  return { items: rows, meta: buildMeta(Number(countRow?.count ?? 0), page, limit) };
}

export async function findUserById(id: string): Promise<User | null> {
  return queryOne<User>(`${SELECT_USER} WHERE u.id = $1 LIMIT 1`, [id]);
}

/** Includes the bcrypt hash — only for the login flow. */
export async function findUserCredentialsByEmail(email: string): Promise<Row | null> {
  return queryOne<Row>(
    `SELECT u.id            AS "id",
            u.email         AS "email",
            u.full_name     AS "fullName",
            u.password_hash AS "passwordHash",
            u.is_active     AS "isActive",
            u.role_id       AS "roleId",
            r.code          AS "roleCode",
            r.base_role     AS "baseRole"
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.email = lower($1)
      LIMIT 1`,
    [email],
  );
}

export async function createUser(input: CreateUserRequest & { passwordHash: string }): Promise<User> {
  const row = await queryOne<Row>(
    `INSERT INTO users (email, password_hash, full_name, role_id, is_active)
     VALUES (lower($1), $2, $3, $4, COALESCE($5, TRUE))
     RETURNING id`,
    [input.email, input.passwordHash, input.fullName, input.roleId, input.isActive ?? null],
  );

  const created = await findUserById(String(row?.id));
  if (!created) throw notFound('User');
  return created;
}

export async function updateUser(id: string, input: UpdateUserRequest & { passwordHash?: string }): Promise<User> {
  const sets: string[] = [];
  const params: unknown[] = [];

  const push = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.email !== undefined) push('email', input.email.toLowerCase());
  if (input.fullName !== undefined) push('full_name', input.fullName);
  if (input.roleId !== undefined) push('role_id', input.roleId);
  if (input.isActive !== undefined) push('is_active', input.isActive);
  if (input.passwordHash !== undefined) push('password_hash', input.passwordHash);

  if (sets.length > 0) {
    params.push(id);
    const row = await queryOne<Row>(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id`,
      params,
    );
    if (!row) throw notFound('User', id);
  }

  const updated = await findUserById(id);
  if (!updated) throw notFound('User', id);
  return updated;
}

export async function deleteUser(id: string): Promise<void> {
  const row = await queryOne<Row>(`DELETE FROM users WHERE id = $1 RETURNING id`, [id]);
  if (!row) throw notFound('User', id);
}

export async function touchLastLogin(id: string): Promise<void> {
  await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [id]);
}

export async function countUsersByEmail(email: string, excludeId?: string): Promise<number> {
  const row = excludeId
    ? await queryOne<{ count: string }>(
        `SELECT count(*)::text AS count FROM users WHERE email = lower($1) AND id <> $2`,
        [email, excludeId],
      )
    : await queryOne<{ count: string }>(
        `SELECT count(*)::text AS count FROM users WHERE email = lower($1)`,
        [email],
      );
  return Number(row?.count ?? 0);
}

/** Guards against locking every administrator out of the system. */
export async function countActiveAdmins(): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.is_active = TRUE
        AND COALESCE(r.base_role, r.code) = 'ADMIN'`,
  );
  return Number(row?.count ?? 0);
}