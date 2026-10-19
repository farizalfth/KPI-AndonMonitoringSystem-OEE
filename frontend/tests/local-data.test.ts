import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api-error';
import {
  createLocal,
  listLocal,
  lookupLocal,
  removeLocal,
  resetLocalData,
  updateLocal,
} from '@/services/local-data';
import { createRow, listRows, serverOffline } from '@/services/resource';

vi.mock('@/services/api', () => {
  const unreachable = () => Promise.reject(new ApiError('Cannot reach the server.', 'NETWORK_ERROR', 0));
  return {
    getList: vi.fn(unreachable),
    post: vi.fn(unreachable),
    put: vi.fn(unreachable),
    remove: vi.fn(unreachable),
    getOne: vi.fn(unreachable),
    patch: vi.fn(unreachable),
  };
});

beforeEach(() => {
  resetLocalData();
  serverOffline.value = false;
});

describe('demo store (local-data)', () => {
  it('seeds and lists a resource with pagination metadata', () => {
    const result = listLocal<Record<string, unknown>>('/machines', { page: 1, limit: 2, sortBy: 'code' });

    expect(result.meta.total).toBe(3);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]?.code).toBe('MC-001');
  });

  it('filters by search term and by exact params', () => {
    expect(listLocal('/machines', { search: 'assembly' }).meta.total).toBe(1);
    expect(listLocal('/machines', { status: 'RUNNING' }).meta.total).toBe(1);
  });

  it('creates, updates and deletes rows', () => {
    const created = createLocal<Record<string, unknown>>('/machines', {
      code: 'MC-009',
      name: 'Line 9 Press',
      isActive: true,
    });

    expect(created.id).toBeTruthy();
    expect(listLocal('/machines').meta.total).toBe(4);

    const updated = updateLocal<Record<string, unknown>>('/machines', String(created.id), {
      name: 'Line 9 Press (rev B)',
    });
    expect(updated.name).toBe('Line 9 Press (rev B)');
    expect(lookupLocal('/machines', String(created.id))?.name).toBe('Line 9 Press (rev B)');

    removeLocal('/machines', String(created.id));
    expect(listLocal('/machines').meta.total).toBe(3);
  });

  it('rejects a duplicate code with a 409', () => {
    expect(() => createLocal('/machines', { code: 'MC-001', name: 'Duplicate' })).toThrowError(ApiError);
    try {
      createLocal('/machines', { code: 'mc-001', name: 'Duplicate' });
    } catch (caught) {
      expect(caught).toBeInstanceOf(ApiError);
      expect((caught as ApiError).status).toBe(409);
    }
  });

  it('404s when updating or deleting an unknown row', () => {
    expect(() => updateLocal('/machines', 'missing', { name: 'x' })).toThrowError(ApiError);
    expect(() => removeLocal('/machines', 'missing')).toThrowError(ApiError);
  });

  it('re-seeds after a reset', () => {
    createLocal('/machines', { code: 'MC-777', name: 'Temporary press' });
    expect(listLocal('/machines').meta.total).toBe(4);

    resetLocalData();
    expect(listLocal('/machines').meta.total).toBe(3);
  });
});

describe('resource resolver', () => {
  it('uses the demo store for module resources without calling the API', async () => {
    const { data, meta } = await listRows<Record<string, unknown>>('/work-orders', { sortBy: 'code' });

    expect(meta.total).toBe(3);
    expect(data[0]?.code).toBe('WO-DAILY-DEMO');
    expect(serverOffline.value).toBe(false);
  });

  it('falls back to the demo store when the backend is unreachable', async () => {
    const { data, meta } = await listRows<Record<string, unknown>>('/machines', { sortBy: 'code' });

    expect(meta.total).toBe(3);
    expect(data).toHaveLength(3);
    expect(serverOffline.value).toBe(true);
  });

  it('creates through the demo store while offline', async () => {
    const created = await createRow<Record<string, unknown>>('/items', {
      code: 'ITEM-Z',
      name: 'Product Z',
      isActive: true,
    });

    expect(created.id).toBeTruthy();
    expect(listLocal('/items').meta.total).toBe(4);
    expect(serverOffline.value).toBe(true);
  });

  it('keeps failing loudly on a real API error', async () => {
    const { getList } = await import('@/services/api');
    vi.mocked(getList).mockImplementationOnce(() =>
      Promise.reject(new ApiError('Duplicate code', 'CONFLICT', 409)),
    );

    await expect(listRows('/machines')).rejects.toMatchObject({ status: 409 });
    expect(serverOffline.value).toBe(false);
  });
});
