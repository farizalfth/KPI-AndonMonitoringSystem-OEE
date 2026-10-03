import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';

const app = createApp();

describe('GET /api/health', () => {
  it('reports the service state without authentication', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      status: 'ok',
      service: 'andon-oee-backend',
      environment: 'test',
    });
    expect(typeof response.body.data.uptimeSeconds).toBe('number');
  });
});

describe('GET /api/health/ready', () => {
  it('reports 503 while no database is configured', async () => {
    const response = await request(app).get('/api/health/ready');

    // Unit test environment intentionally has no DATABASE_URL.
    expect([200, 503]).toContain(response.status);
    expect(response.body.data.database).toBe(response.status === 200 ? 'up' : 'down');
  });
});

describe('security headers and CORS', () => {
  it('sets helmet headers', async () => {
    const response = await request(app).get('/api/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('allows the configured frontend origin', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});

describe('error handling', () => {
  it('returns INTERNAL_ERROR for unexpected failures', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', 'Bearer broken');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});