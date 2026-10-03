import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';

import type { JwtPayload } from '@andon/shared';
import { permissionsForRole } from '@andon/shared';

import { authenticate, signAccessToken, verifyAccessToken } from '../src/middleware/auth';
import { requirePermission, requireRole } from '../src/middleware/rbac';

function fakeRequest(auth?: JwtPayload): Request {
  return { headers: {}, auth } as unknown as Request;
}

function fakeResponse(): Response {
  return {} as Response;
}

function run(middleware: (req: Request, res: Response, next: NextFunction) => void, req: Request) {
  const next = vi.fn();
  middleware(req, fakeResponse(), next);
  return next;
}

describe('JWT verification', () => {
  it('round trips a payload and derives permissions from the role, not the token', () => {
    const token = signAccessToken({
      sub: 'user-1',
      email: 'operator@example.com',
      role: 'OPERATOR',
      // A tampered token could try to smuggle extra permissions:
      permissions: ['masterdata:write', 'users:manage'] as JwtPayload['permissions'],
    });

    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('OPERATOR');
    expect(payload.permissions).toEqual(permissionsForRole('OPERATOR'));
    expect(payload.permissions).not.toContain('masterdata:write');
  });

  it('rejects a token signed with another secret', () => {
    const foreign = jwt.sign({ sub: 'x', email: 'x@x.com', role: 'ADMIN' }, 'another-secret-value');
    expect(() => verifyAccessToken(foreign)).toThrow();
  });
});

describe('authenticate middleware', () => {
  it('rejects requests without an Authorization header', () => {
    const next = run(authenticate, fakeRequest());

    expect(next).toHaveBeenCalledOnce();
    const error = next.mock.calls[0]?.[0] as { code: string; statusCode: number };
    expect(error.code).toBe('UNAUTHENTICATED');
    expect(error.statusCode).toBe(401);
  });

  it('rejects "Bearer" without a token', () => {
    const req = { headers: { authorization: 'Bearer' } } as unknown as Request;
    expect(run(authenticate, req)).toHaveBeenCalledOnce();
  });

  it('populates req.auth for a valid token', () => {
    const token = signAccessToken({
      sub: 'user-2',
      email: 'supervisor@example.com',
      role: 'SUPERVISOR',
      permissions: permissionsForRole('SUPERVISOR'),
    });
    const req = fakeRequest();
    req.headers.authorization = `Bearer ${token}`;

    const next = run(authenticate, req);

    expect(next).toHaveBeenCalledWith();
    expect(req.auth?.sub).toBe('user-2');
    expect(req.auth?.role).toBe('SUPERVISOR');
  });
});

describe('requirePermission', () => {
  it('allows a user that holds the permission', () => {
    const auth: JwtPayload = {
      sub: 'u',
      email: 'supervisor@example.com',
      role: 'SUPERVISOR',
      permissions: permissionsForRole('SUPERVISOR'),
    };
    const next = run(requirePermission('workorder:approve'), fakeRequest(auth));
    expect(next).toHaveBeenCalledWith();
  });

  it('forbids a user without the permission (403 FORBIDDEN)', () => {
    const auth: JwtPayload = {
      sub: 'u',
      email: 'operator@example.com',
      role: 'OPERATOR',
      permissions: permissionsForRole('OPERATOR'),
    };
    const next = run(requirePermission('analytics:view'), fakeRequest(auth));

    const error = next.mock.calls[0]?.[0] as { code: string; statusCode: number };
    expect(error.code).toBe('FORBIDDEN');
    expect(error.statusCode).toBe(403);
  });

  it('requires authentication first', () => {
    const next = run(requirePermission('masterdata:read'), fakeRequest());
    const error = next.mock.calls[0]?.[0] as { code: string };
    expect(error.code).toBe('UNAUTHENTICATED');
  });

  it('accepts any of several permissions', () => {
    const auth: JwtPayload = {
      sub: 'u',
      email: 'operator@example.com',
      role: 'OPERATOR',
      permissions: permissionsForRole('OPERATOR'),
    };
    expect(run(requirePermission('masterdata:write', 'andon:view'), fakeRequest(auth))).toHaveBeenCalledWith();
  });
});

describe('requireRole', () => {
  it('allows the listed role only', () => {
    const operator: JwtPayload = {
      sub: 'u',
      email: 'operator@example.com',
      role: 'OPERATOR',
      permissions: permissionsForRole('OPERATOR'),
    };
    expect(run(requireRole('OPERATOR'), fakeRequest(operator))).toHaveBeenCalledWith();

    const next = run(requireRole('ADMIN'), fakeRequest(operator));
    expect((next.mock.calls[0]?.[0] as { statusCode: number }).statusCode).toBe(403);
  });
});