import { ROLE_PERMISSIONS } from '@andon/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { tokenFor } from './helpers/tokens';

const credentials = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'admin@example.com',
  fullName: 'Andon Admin',
  passwordHash: '',
  isActive: true,
  roleId: '00000000-0000-4000-8000-000000000001',
  roleCode: 'ADMIN',
  baseRole: 'ADMIN',
};

/** ADMIN permission set, as returned by `login` and `/me` since the contract change. */
const adminPermissions = ROLE_PERMISSIONS.ADMIN;

const publicUser = {
  id: credentials.id,
  email: credentials.email,
  fullName: credentials.fullName,
  roleId: credentials.roleId,
  roleCode: 'ADMIN',
  roleName: 'Administrator',
  isActive: true,
  lastLoginAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

vi.mock('../src/models/user.model', () => ({
  findUserCredentialsByEmail: vi.fn(),
  findUserById: vi.fn(),
  touchLastLogin: vi.fn(async () => undefined),
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  countUsersByEmail: vi.fn(async () => 0),
  countActiveAdmins: vi.fn(async () => 1),
}));

const userModel = await import('../src/models/user.model');

const app = createApp();

beforeEach(async () => {
  vi.clearAllMocks();
  credentials.passwordHash = bcrypt.hashSync('Password123!', 4);
  vi.mocked(userModel.findUserCredentialsByEmail).mockImplementation(async (email: string) =>
    email === credentials.email ? { ...credentials } : null,
  );
  vi.mocked(userModel.findUserById).mockResolvedValue(publicUser);
});

describe('POST /api/auth/login', () => {
  it('returns a token and the public user for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'Password123!' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.tokenType).toBe('Bearer');
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.user).toEqual({ ...publicUser, permissions: adminPermissions });
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    expect(userModel.touchLastLogin).toHaveBeenCalledWith(credentials.id);
  });

  it('accepts a lowercase/uppercase email and surrounding whitespace', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '  ADMIN@EXAMPLE.COM ', password: 'Password123!' });

    expect(response.status).toBe(200);
    expect(userModel.findUserCredentialsByEmail).toHaveBeenCalledWith('admin@example.com');
  });

  it('rejects a wrong password with 401 INVALID_CREDENTIALS', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'WrongPassword1' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
    expect(userModel.touchLastLogin).not.toHaveBeenCalled();
  });

  it('returns the same error for an unknown account (no user enumeration)', async () => {
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password123!' });

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'WrongPassword1' });

    expect(unknown.status).toBe(401);
    expect(unknown.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknown.body.error.message).toBe(wrongPassword.body.error.message);
  });

  it('refuses an inactive account', async () => {
    vi.mocked(userModel.findUserCredentialsByEmail).mockResolvedValue({
      ...credentials,
      isActive: false,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'Password123!' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('validates the request body', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: expect.stringContaining('email') })]),
    );
  });
});

describe('GET /api/auth/me', () => {
  it('returns the authenticated user', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'Password123!' });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ ...publicUser, permissions: adminPermissions });
    expect(response.body.data.permissions).toContain('users:manage');
  });

  it('requires a token', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a malformed or tampered token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.jwt');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('ignores a non-bearer scheme', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Basic dXNlcjpwYXNz');

    expect(response.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 204 for an authenticated request', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${tokenFor('OPERATOR')}`);

    expect(response.status).toBe(204);
  });

  it('requires authentication', async () => {
    const response = await request(app).post('/api/auth/logout');
    expect(response.status).toBe(401);
  });
});