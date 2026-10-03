import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { adminToken, operatorToken, supervisorToken } from './helpers/tokens';

/**
 * Masterdata route tests.
 *
 * The repositories are mocked so the whole HTTP + validation + RBAC + error
 * handling chain is exercised without a database. The real SQL is covered by
 * `tests/database.integration.test.ts` (runs when DATABASE_URL is set).
 */

const { machines, roles, generic, SEED_MACHINE } = vi.hoisted(() => {
  function createFakeRepository(seed: Record<string, unknown>[] = []) {
    const rows: Record<string, unknown>[] = [...seed];
    return {
      definition: {} as never,
      list: vi.fn(async () => ({
        items: rows,
        meta: { page: 1, limit: 20, total: rows.length, totalPages: 1 },
      })),
      findById: vi.fn(async (id: string) => rows.find((row) => row.id === id) ?? null),
      findOneBy: vi.fn(async (field: string, value: unknown) =>
        rows.find((row) => row[field] === value) ?? null,
      ),
      create: vi.fn(async (data: Record<string, unknown>) => {
        const row = { id: 'generated-id', createdAt: '', updatedAt: '', ...data };
        rows.push(row);
        return row;
      }),
      update: vi.fn(async (id: string, data: Record<string, unknown>) => {
        const row = rows.find((candidate) => candidate.id === id);
        if (!row) return null;
        Object.assign(row, data);
        return row;
      }),
      remove: vi.fn(async (id: string) => {
        const index = rows.findIndex((candidate) => candidate.id === id);
        if (index >= 0) rows.splice(index, 1);
      }),
      count: vi.fn(async () => rows.length),
      rows,
    };
  }

  const seedMachine = {
    id: '40000000-0000-4000-8000-000000000001',
    code: 'MC-001',
    name: 'Injection Molding 1',
    status: 'IDLE',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  return {
    machines: createFakeRepository([seedMachine]),
    roles: createFakeRepository([
      {
        id: '00000000-0000-4000-8000-000000000002',
        code: 'SUPERVISOR',
        name: 'Supervisor',
        baseRole: 'SUPERVISOR',
        isSystem: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
    generic: {
      shifts: createFakeRepository(),
      items: createFakeRepository(),
      abnormalities: createFakeRepository(),
      defects: createFakeRepository(),
      productionSetups: createFakeRepository(),
    },
    SEED_MACHINE: seedMachine,
  };
});

vi.mock('../src/models/masterdata.model', () => ({
  machineRepository: machines,
  roleRepository: roles,
  shiftRepository: generic.shifts,
  itemRepository: generic.items,
  abnormalityRepository: generic.abnormalities,
  defectRepository: generic.defects,
  productionSetupRepository: generic.productionSetups,
  CYCLE_TIME_UNIT: 'seconds',
}));

vi.mock('../src/models/user.model', () => ({
  listUsers: vi.fn(async () => ({
    items: [
      {
        id: '10000000-0000-4000-8000-000000000001',
        email: 'admin@example.com',
        fullName: 'Andon Admin',
        roleId: '00000000-0000-4000-8000-000000000001',
        roleCode: 'ADMIN',
        roleName: 'Administrator',
        isActive: true,
        lastLoginAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  })),
  findUserById: vi.fn(),
  findUserCredentialsByEmail: vi.fn(),
  touchLastLogin: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  countUsersByEmail: vi.fn(async () => 0),
  countActiveAdmins: vi.fn(async () => 1),
}));

const app = createApp();

beforeEach(() => {
  vi.clearAllMocks();
  machines.rows.splice(0, machines.rows.length, { ...SEED_MACHINE });
});

describe('masterdata authentication', () => {
  it('rejects an unauthenticated list request', async () => {
    const response = await request(app).get('/api/machines');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('GET /api/machines', () => {
  it('returns the paginated envelope', async () => {
    const response = await request(app)
      .get('/api/machines')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [expect.objectContaining({ code: 'MC-001', status: 'IDLE' })],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('is readable by an operator (masterdata:read)', async () => {
    const response = await request(app)
      .get('/api/machines')
      .set('Authorization', `Bearer ${operatorToken()}`);

    expect(response.status).toBe(200);
  });
});

describe('POST /api/machines', () => {
  it('creates a machine and uppercases the code', async () => {
    const response = await request(app)
      .post('/api/machines')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ code: 'mc-004', name: 'Packaging Station', area: 'Line C' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({ code: 'MC-004', name: 'Packaging Station' });
  });

  it('is forbidden for an operator', async () => {
    const response = await request(app)
      .post('/api/machines')
      .set('Authorization', `Bearer ${operatorToken()}`)
      .send({ code: 'MC-009', name: 'Should not be created' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('is forbidden for a supervisor (no masterdata:write)', async () => {
    const response = await request(app)
      .post('/api/machines')
      .set('Authorization', `Bearer ${supervisorToken()}`)
      .send({ code: 'MC-009', name: 'Should not be created' });

    expect(response.status).toBe(403);
  });

  it('rejects an invalid payload with field details', async () => {
    const response = await request(app)
      .post('/api/machines')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ code: 'x', name: 'a' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'code' })]),
    );
  });

  it('returns 409 CONFLICT for a duplicate code', async () => {
    const response = await request(app)
      .post('/api/machines')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ code: 'MC-001', name: 'Duplicate' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
    expect(response.body.error.message).toContain('MC-001');
  });
});

describe('GET /api/machines/:id', () => {
  it('returns the entity', async () => {
    const response = await request(app)
      .get('/api/machines/40000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.data.code).toBe('MC-001');
  });

  it('returns 404 for an unknown id', async () => {
    const response = await request(app)
      .get('/api/machines/40000000-0000-4000-8000-0000000000ff')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed id', async () => {
    const response = await request(app)
      .get('/api/machines/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT /api/machines/:id', () => {
  it('updates a subset of fields', async () => {
    const response = await request(app)
      .put('/api/machines/40000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Injection Molding 1 (rev B)' });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Injection Molding 1 (rev B)');
    expect(response.body.data.code).toBe('MC-001');
  });

  it('rejects an empty body', async () => {
    const response = await request(app)
      .put('/api/machines/40000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /api/machines/:id', () => {
  it('returns 204 and removes the row', async () => {
    const response = await request(app)
      .delete('/api/machines/40000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(response.status).toBe(204);
    expect(machines.remove).toHaveBeenCalledWith('40000000-0000-4000-8000-000000000001');
  });
});

describe('GET /api/roles', () => {
  it('hydrates the permission matrix from the role base role', async () => {
    const response = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.data[0].permissions).toContain('workorder:approve');
    expect(response.body.data[0].permissions).not.toContain('users:manage');
  });
});

describe('/api/users', () => {
  it('requires the users:manage permission', async () => {
    const forbidden = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${supervisorToken()}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken()}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data[0].email).toBe('admin@example.com');
  });

  it('validates the create payload', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ email: 'new@example.com', password: 'weak' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('unknown routes', () => {
  it('returns the standard 404 envelope', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route GET /api/does-not-exist does not exist',
      },
    });
  });
});