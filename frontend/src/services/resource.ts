import type { PaginationMeta } from '@andon/shared';

import { ref } from 'vue';

import { getList, post, put, remove } from '@/services/api';
import { ApiError } from '@/services/api-error';
import {
  createLocal,
  isLocalPath,
  listLocal,
  removeLocal,
  updateLocal,
} from '@/services/local-data';

/**
 * Single entry point every screen uses to read and write records.
 *
 * Resolution order:
 *  1. resources without a backend (`services/local-data.ts` `LOCAL_PATHS`)
 *     always run against the in-browser demo store;
 *  2. everything else calls the real API first, so the app keeps using live
 *     data whenever the backend is running;
 *  3. when the server cannot be reached at all (network error, not a 4xx) the
 *     call transparently falls back to the demo store — buttons, forms and
 *     delete confirmation keep working without a backend.
 *
 * `serverOffline` drives the banner in `AppLayout.vue`.
 */
export const serverOffline = ref(false);

function isUnreachable(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 0;
}

/**
 * Once the backend is unreachable the session stays on demo data (sticky) so
 * records created while offline remain visible for the rest of the session
 * instead of silently disappearing when a later request succeeds.
 */
function useLocal(path: string): boolean {
  return isLocalPath(path) || serverOffline.value;
}

function reachedServer(): void {
  serverOffline.value = false;
}

function fellBack(): void {
  serverOffline.value = true;
}

export async function listRows<T>(
  path: string,
  params?: Record<string, unknown>,
): Promise<{ data: T[]; meta: PaginationMeta }> {
  if (useLocal(path)) return listLocal<T>(path, params);

  try {
    const result = await getList<T>(path, params);
    reachedServer();
    return result;
  } catch (error) {
    if (!isUnreachable(error)) throw error;
    fellBack();
    return listLocal<T>(path, params);
  }
}

export async function createRow<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (useLocal(path)) return createLocal<T>(path, body);

  try {
    const created = await post<T>(path, body);
    reachedServer();
    return created;
  } catch (error) {
    if (!isUnreachable(error)) throw error;
    fellBack();
    return createLocal<T>(path, body);
  }
}

export async function updateRow<T>(
  path: string,
  id: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (useLocal(path)) return updateLocal<T>(path, id, body);

  try {
    const updated = await put<T>(`${path}/${id}`, body);
    reachedServer();
    return updated;
  } catch (error) {
    if (!isUnreachable(error)) throw error;
    fellBack();
    return updateLocal<T>(path, id, body);
  }
}

export async function deleteRow(path: string, id: string): Promise<void> {
  if (useLocal(path)) {
    removeLocal(path, id);
    return;
  }

  try {
    await remove(`${path}/${id}`);
    reachedServer();
  } catch (error) {
    if (!isUnreachable(error)) throw error;
    fellBack();
    removeLocal(path, id);
  }
}

/** Marks the backend as reachable again (used by the auth session). */
export function markServerOnline(): void {
  reachedServer();
}

/** Marks the backend as unreachable (used by the auth session). */
export function markServerOffline(): void {
  fellBack();
}
