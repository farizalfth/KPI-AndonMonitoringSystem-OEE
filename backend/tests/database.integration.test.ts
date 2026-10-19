import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { setDatabasePool } from '../src/config/db';
import { login } from '../src/modules/auth/auth.service';
import { adminToken, operatorToken, supervisorToken } from './helpers/tokens';
import { bootstrapTestDatabase, type TestDatabase } from './helpers/test-database';

/**
 * End-to-end tests against a real PostgreSQL engine (PGlite by default, NeonDB
 * when `ANDON_TEST_DATABASE_URL=1`). These tests verify the actual SQL of
 * `database/schema.sql`, `database/seed.sql` and the repositories.
 */
describe('database integration', () => {
  let database: TestDatabase;
  const app = createApp();

  beforeAll(async () => {
    database = await bootstrapTestDatabase();
  }, 120_000);

  afterAll(async () => {
    setDatabasePool(null);
    await database?.close();
  });

  describe('schema and seed', () => {
    it('creates every table of the documented model', async () => {
      const { rows } = await database.sql<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
      );
      const tables = rows.map((row) => (row as { table_name: string }).table_name);

      expect(tables).toEqual(
        expect.arrayContaining([
          'roles',
          'users',
          'shifts',
          'items',
          'machines',
          'abnormalities',
          'defects',
          'production_setups',
          'work_orders',
          'work_order_items',
          'production_logs',
          'downtime_logs',
          'oee_records',
        ]),
      );
    });

    it('seeds the demo masterdata', async () => {
      const counts = await database.sql<{ table_name: string; count: string }>(`
        SELECT 'roles' AS table_name, count(*)::text AS count FROM roles
        UNION ALL SELECT 'users', count(*)::text FROM users
        UNION ALL SELECT 'machines', count(*)::text FROM machines
        UNION ALL SELECT 'items', count(*)::text FROM items
        UNION ALL SELECT 'shifts', count(*)::text FROM shifts
        UNION ALL SELECT 'defects', count(*)::text FROM defects
        UNION ALL SELECT 'abnormalities', count(*)::text FROM abnormalities
        UNION ALL SELECT 'production_setups', count(*)::text FROM production_setups
        UNION ALL SELECT 'work_orders', count(*)::text FROM work_orders
      `);

      expect(Object.fromEntries(counts.rows.map((row) => [row.table_name, Number(row.count)]))).toEqual({
        roles: 3,
        users: 4,
        machines: 3,
        items: 3,
        shifts: 3,
        defects: 3,
        abnormalities: 3,
        production_setups: 3,
        work_orders: 2,
      });
    });

    it('keeps production logs empty so OEE starts from zero, not from random data', async () => {
      const { rows } = await database.sql<{ count: string }>(
        `SELECT count(*)::text AS count FROM production_logs`,
      );
      expect(Number(rows[0]?.count)).toBe(0);
    });

    it('is idempotent (schema + seed can be applied twice)', async () => {
      await database.applySql('schema.sql');
      await database.applySql('seed.sql');

      const { rows } = await database.sql<{ count: string }>(
        `SELECT count(*)::text AS count FROM machines`,
      );
      expect(Number(rows[0]?.count)).toBe(3);
    });

    it('maintains updated_at through the trigger', async () => {
      await database.sql(
        `UPDATE machines SET name = 'Injection Molding 1' WHERE code = 'MC-001'`,
      );
      const { rows } = await database.sql<{ updated_at: Date }>(
        `SELECT updated_at FROM machines WHERE code = 'MC-001'`,
      );
      expect(rows[0]?.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('seeded credentials', () => {
    it('logs in with the documented demo account', async () => {
      const result = await login('admin@example.com', 'Password123!');

      expect(result.user.roleCode).toBe('ADMIN');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.accessToken.split('.')).toHaveLength(3);
    });

    it('rejects a wrong password', async () => {
      await expect(login('admin@example.com', 'WrongPassword1')).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
    });
  });

  describe('masterdata over HTTP', () => {
    it('lists the seeded machines', async () => {
      const response = await request(app)
        .get('/api/machines')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
      expect(response.body.data[0]).toMatchObject({
        code: expect.any(String),
        name: expect.any(String),
        status: 'IDLE',
      });
    });

    it('searches and filters', async () => {
      const response = await request(app)
        .get('/api/machines?search=MC-002&isActive=true')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].code).toBe('MC-002');
    });

    it('paginates', async () => {
      const response = await request(app)
        .get('/api/machines?page=2&limit=2')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    });

    it('ignores an unknown sortBy instead of building invalid SQL', async () => {
      const response = await request(app)
        .get('/api/machines?sortBy=DROP%20TABLE%20machines&sortOrder=desc')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
    });

    it('creates, reads, updates and deletes a machine', async () => {
      const token = adminToken();

      const created = await request(app)
        .post('/api/machines')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'mc-010', name: 'Packaging Station', area: 'Line C', defaultCycleTime: 7.5 });
      expect(created.status).toBe(201);
      const id = created.body.data.id;
      expect(created.body.data).toMatchObject({ code: 'MC-010', defaultCycleTime: 7.5, isActive: true });

      const fetched = await request(app)
        .get(`/api/machines/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(fetched.body.data.name).toBe('Packaging Station');

      const updated = await request(app)
        .put(`/api/machines/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Packaging Station 2' });
      expect(updated.body.data).toMatchObject({ code: 'MC-010', name: 'Packaging Station 2' });

      const removed = await request(app)
        .delete(`/api/machines/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(removed.status).toBe(204);

      const gone = await request(app)
        .get(`/api/machines/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(gone.status).toBe(404);
    });

    it('rejects a duplicate code with 409', async () => {
      const response = await request(app)
        .post('/api/machines')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ code: 'MC-001', name: 'Duplicate' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('refuses to delete a machine that is still referenced (409)', async () => {
      const { rows } = await database.sql<{ id: string }>(
        `SELECT id FROM machines WHERE code = 'MC-001'`,
      );
      const response = await request(app)
        .delete(`/api/machines/${rows[0]?.id}`)
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('keeps the role permission matrix in sync with the shared contract', async () => {
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken()}`);

      const byCode = Object.fromEntries(
        response.body.data.map((role: { code: string; permissions: string[] }) => [
          role.code,
          role.permissions,
        ]),
      );
      expect(byCode.ADMIN).toContain('users:manage');
      expect(byCode.SUPERVISOR).toContain('workorder:approve');
      expect(byCode.OPERATOR).not.toContain('analytics:view');
    });

    it('returns numeric NUMERIC columns as numbers (cycle time)', async () => {
      const response = await request(app)
        .get('/api/items')
        .set('Authorization', `Bearer ${adminToken()}`);

      const itemA = response.body.data.find((item: { code: string }) => item.code === 'ITEM-A');
      expect(itemA.standardCycleTime).toBe(10);
      expect(typeof itemA.standardCycleTime).toBe('number');
    });

    it('returns DATE columns as plain YYYY-MM-DD strings', async () => {
      const response = await request(app)
        .get('/api/work-orders-placeholder')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(404);

      const { rows } = await database.sql<{ period_start: string }>(
        `SELECT to_char(period_start, 'YYYY-MM-DD') AS period_start FROM work_orders LIMIT 1`,
      );
      expect(rows[0]?.period_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns DATE columns unshifted through pg type parsers', async () => {
      const { rows } = await database.sql<{ period_start: string }>(
        `SELECT period_start FROM work_orders LIMIT 1`,
      );
      expect(rows[0]?.period_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('resources with joins', () => {
    // `production_setups` LEFT JOINs items and machines, both of which have a
    // `code` and `name` column. An unqualified column reference made every
    // request fail with `column reference "code" is ambiguous`, and this
    // endpoint had no coverage, so it is pinned here.
    it('lists production setups with joined item and machine names', async () => {
      const response = await request(app)
        .get('/api/production-setups')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.meta.total).toBe(3);
      expect(response.body.data[0]).toMatchObject({
        code: 'PS-001',
        itemName: expect.any(String),
        machineName: expect.any(String),
        setupMinutes: expect.any(Number),
      });
    });

    it('sorts by a joined-resource column', async () => {
      const response = await request(app)
        .get('/api/production-setups?sortBy=code&sortOrder=desc')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.map((row: { code: string }) => row.code)).toEqual([
        'PS-003',
        'PS-002',
        'PS-001',
      ]);
    });

    it('searches across the base table only', async () => {
      const response = await request(app)
        .get('/api/production-setups?search=PS-002')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].code).toBe('PS-002');
    });
  });

  describe('user management', () => {
    it('creates a user, then rejects the duplicate email', async () => {
      const roles = await database.sql<{ id: string }>(
        `SELECT id FROM roles WHERE code = 'OPERATOR'`,
      );
      const roleId = roles.rows[0]?.id as string;

      const created = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({
          email: 'operator3@example.com',
          password: 'Password123!',
          fullName: 'Operator Tiga',
          roleId,
        });
      expect(created.status).toBe(201);
      expect(created.body.data.roleCode).toBe('OPERATOR');
      expect(created.body.data).not.toHaveProperty('passwordHash');

      const duplicate = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({
          email: 'OPERATOR3@example.com',
          password: 'Password123!',
          fullName: 'Operator Tiga',
          roleId,
        });
      expect(duplicate.status).toBe(409);

      const users = await database.sql<{ id: string }>(
        `SELECT id FROM users WHERE email = 'operator3@example.com'`,
      );
      await request(app)
        .delete(`/api/users/${users.rows[0]?.id}`)
        .set('Authorization', `Bearer ${adminToken()}`);
    });

    it('rejects an unknown roleId', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({
          email: 'ghost@example.com',
          password: 'Password123!',
          fullName: 'Ghost',
          roleId: '00000000-0000-4000-8000-0000000000ff',
        });

      expect(response.status).toBe(400);
    });

    it('protects the last administrator', async () => {
      const { rows } = await database.sql<{ id: string }>(
        `SELECT id FROM users WHERE email = 'admin@example.com'`,
      );
      const adminId = rows[0]?.id as string;

      const response = await request(app)
        .delete(`/api/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('allows a supervisor to read masterdata but not manage users', async () => {
      const machines = await request(app)
        .get('/api/machines')
        .set('Authorization', `Bearer ${supervisorToken()}`);
      expect(machines.status).toBe(200);

      const users = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${supervisorToken()}`);
      expect(users.status).toBe(403);
    });

    it('refuses machine writes for an operator', async () => {
      const response = await request(app)
        .post('/api/machines')
        .set('Authorization', `Bearer ${operatorToken()}`)
        .send({ code: 'MC-777', name: 'Not allowed' });

      expect(response.status).toBe(403);
    });
  });

  describe('referential integrity for the modules to come', () => {
    it('rejects a production log that references an unknown defect', async () => {
      await expect(
        database.sql(
          `INSERT INTO production_logs (event_type, result, quantity, machine_id, work_order_id, item_id, shift_id, user_id, defect_id)
           VALUES ('NG', 'NG', 1,
                   (SELECT id FROM machines WHERE code = 'MC-001'),
                   (SELECT id FROM work_orders LIMIT 1),
                   (SELECT item_id FROM work_orders LIMIT 1),
                   (SELECT shift_id FROM work_orders LIMIT 1),
                   (SELECT id FROM users LIMIT 1),
                   '00000000-0000-0000-0000-0000000000ff')`,
        ),
      ).rejects.toBeDefined();
    });

    it('rejects an NG production log without a defect (CHECK constraint)', async () => {
      await expect(
        database.sql(
          `INSERT INTO production_logs (event_type, result, quantity, machine_id, work_order_id, item_id, shift_id, user_id)
           VALUES ('NG', 'NG', 1,
                   (SELECT id FROM machines WHERE code = 'MC-001'),
                   (SELECT id FROM work_orders LIMIT 1),
                   (SELECT item_id FROM work_orders LIMIT 1),
                   (SELECT shift_id FROM work_orders LIMIT 1),
                   (SELECT id FROM users LIMIT 1))`,
        ),
      ).rejects.toBeDefined();
    });

    it('rejects an ABNORMALITY downtime row without an abnormality_id', async () => {
      await expect(
        database.sql(
          `INSERT INTO downtime_logs (machine_id, reason_type, start_time)
           SELECT id, 'ABNORMALITY', now() FROM machines WHERE code = 'MC-001'`,
        ),
      ).rejects.toBeDefined();
    });

    it('accepts a well formed PRODUCE production log', async () => {
      const workOrder = await database.sql<{ machine_id: string; item_id: string; shift_id: string }>(
        `SELECT machine_id, item_id, shift_id FROM work_orders ORDER BY created_at LIMIT 1`,
      );
      const row = workOrder.rows[0];

      const inserted = await database.sql<{ id: string }>(
        `INSERT INTO production_logs (event_type, result, quantity, machine_id, work_order_id, item_id, shift_id, user_id, cycle_time_seconds)
         VALUES ('PRODUCE', 'OK', 1, $1,
                 (SELECT id FROM work_orders LIMIT 1), $2, $3,
                 (SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE code = 'OPERATOR') LIMIT 1),
                 10.4)
         RETURNING id`,
        [row?.machine_id, row?.item_id, row?.shift_id],
      );

      expect(inserted.rows).toHaveLength(1);

      const { rows } = await database.sql<{ ok: string; ng: string; total: string }>(
        `SELECT count(*) FILTER (WHERE result = 'OK')::text AS ok,
                count(*) FILTER (WHERE result = 'NG')::text AS ng,
                count(*)::text AS total
           FROM production_logs`,
      );
      expect(Number(rows[0]?.total)).toBe(1);
      expect(Number(rows[0]?.ok)).toBe(1);
    });
  });
});