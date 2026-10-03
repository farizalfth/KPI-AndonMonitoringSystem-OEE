import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

import type { JwtPayload as AndonJwtPayload } from '@andon/shared';

import { env } from '../config/env';
import { unauthenticated } from '../lib/errors';
import { permissionsForRole } from '@andon/shared';

export function signAccessToken(payload: Omit<AndonJwtPayload, 'iat' | 'exp'>): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyAccessToken(token: string): AndonJwtPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (typeof decoded === 'string') {
    throw unauthenticated('Malformed access token');
  }

  const payload = decoded as JwtPayload;
  if (!payload.sub || !payload.email || !payload.role) {
    throw unauthenticated('Access token is missing required claims');
  }

  return {
    sub: String(payload.sub),
    email: String(payload.email),
    role: payload.role as AndonJwtPayload['role'],
    // Permissions are derived from the role code, never trusted from the token
    // body, so a tampered token cannot escalate privileges.
    permissions: permissionsForRole(payload.role as AndonJwtPayload['role']),
  };
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;

  return token.trim();
}

/** Requires a valid access token; populates `req.auth`. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    next(unauthenticated('Missing bearer token'));
    return;
  }

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(unauthenticated('Access token expired'));
      return;
    }
    next(unauthenticated('Invalid access token'));
  }
}

/** Attaches `req.auth` when a valid token is present, but never rejects. */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (token) {
    try {
      req.auth = verifyAccessToken(token);
    } catch {
      // ignore, the route does not require authentication
    }
  }
  next();
}