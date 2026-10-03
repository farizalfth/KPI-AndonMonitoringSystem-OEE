import { beforeEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/services/api-error';
import { ACCESS_TOKEN_STORAGE_KEY, readAccessToken, writeAccessToken } from '@/services/token-storage';

describe('token storage', () => {
  beforeEach(() => window.localStorage.clear());

  it('returns null when no token is stored', () => {
    expect(readAccessToken()).toBeNull();
  });

  it('round-trips a token through localStorage', () => {
    writeAccessToken('token-123');
    expect(readAccessToken()).toBe('token-123');
    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('token-123');

    writeAccessToken(null);
    expect(readAccessToken()).toBeNull();
  });
});

describe('ApiError', () => {
  it('keeps code, status and details', () => {
    const error = new ApiError('Duplicate code', 'CONFLICT', 409, { field: 'code' });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Duplicate code');
    expect(error.code).toBe('CONFLICT');
    expect(error.status).toBe(409);
    expect(error.details).toEqual({ field: 'code' });
  });
});
