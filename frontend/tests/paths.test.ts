/**
 * Guards the frontend against API path drift.
 *
 * `docs/api.md` is the contract handed to the members building work orders,
 * production, OEE and analytics, so the frontend must call exactly the paths
 * documented there. This test reads the markdown table itself, which means a
 * contract change that is not mirrored in `API_PATHS` fails CI.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { MasterdataResource } from '@/services/paths';
import { API_PATHS, masterdataPath } from '@/services/paths';

const here = dirname(fileURLToPath(import.meta.url));
const apiDoc = readFileSync(resolve(here, '../../docs/api.md'), 'utf8');

describe('API paths match docs/api.md', () => {
  it('documents every masterdata resource at the API root', () => {
    for (const resource of Object.keys(API_PATHS.masterdata)) {
      expect(apiDoc).toContain(`/api${masterdataPath(resource)}`);
    }
  });

  it('never prefixes masterdata resources with /masterdata', () => {
    // The backend mounts these routers at the API root; the SPA route
    // `/masterdata/machines` is a frontend concept and must not leak into URLs.
    expect(apiDoc).not.toContain('/api/masterdata/');
    for (const resource of Object.keys(API_PATHS.masterdata)) {
      expect(masterdataPath(resource)).toBe(`/${resource}`);
      expect(API_PATHS.masterdata[resource as MasterdataResource]).toBe(`/${resource}`);
    }
  });

  it('documents the auth endpoints', () => {
    for (const path of Object.values(API_PATHS.auth)) {
      expect(apiDoc).toContain(`/api${path}`);
    }
  });
});
