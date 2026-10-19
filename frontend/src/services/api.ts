import type { ApiErrorResponse, ApiSuccessResponse, PaginationMeta, PageQuery } from '@andon/shared';

import type {
  AxiosError} from 'axios';
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { ApiError } from '@/services/api-error';
import { readAccessToken, writeAccessToken } from '@/services/token-storage';

/**
 * Axios instance + the response envelope contract from docs/api.md.
 *
 * Rules enforced here so no component has to repeat them:
 *  - the bearer token is attached automatically;
 *  - the envelope is unwrapped: callers get `data` (and `meta`);
 *  - every failure is normalised into an `ApiError` with a readable message;
 *  - a 401 clears the session and redirects to the login page exactly once.
 */

export const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;

    if (status === 401) {
      writeAccessToken(null);
      onUnauthorized?.();
    }

    if (!body || typeof body !== 'object' || !('error' in body)) {
      // The backend never answered with its envelope (dev proxy error page,
      // gateway timeout, CORS block, …). This is a transport failure, not an
      // API error: the status is normalised to 0 so callers can tell "the
      // server did not answer" apart from "the server rejected the request"
      // and fall back to the local demo store.
      return Promise.reject(
        new ApiError(
          error.code === 'ECONNABORTED'
            ? 'The server took too long to respond.'
            : 'Cannot reach the server. Is the backend running?',
          error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR',
          0,
          { httpStatus: status },
        ),
      );
    }

    return Promise.reject(new ApiError(body.error.message, body.error.code, status, body.error.details));
  },
);

export interface RequestOptions extends AxiosRequestConfig {
  params?: Record<string, unknown> | PageQuery;
}

/** GET that unwraps `{ success, data, meta }` into `{ data, meta }`. */
export async function getList<T>(
  path: string,
  params?: RequestOptions['params'],
  config: RequestOptions = {},
): Promise<{ data: T[]; meta: PaginationMeta }> {
  const response = await http.get<ApiSuccessResponse<T[]>>(path, { ...config, params });
  const rows = response.data.data ?? [];
  return {
    data: rows,
    meta:
      response.data.meta ??
      ({
        page: 1,
        limit: rows.length,
        total: rows.length,
        totalPages: 1,
      } as PaginationMeta),
  };
}

export async function getOne<T>(path: string, config: RequestOptions = {}): Promise<T> {
  const response = await http.get<ApiSuccessResponse<T>>(path, config);
  return response.data.data;
}

export async function post<T>(path: string, body?: unknown, config: RequestOptions = {}): Promise<T> {
  const response = await http.post<ApiSuccessResponse<T>>(path, body, config);
  return response.data.data;
}

export async function put<T>(path: string, body?: unknown, config: RequestOptions = {}): Promise<T> {
  const response = await http.put<ApiSuccessResponse<T>>(path, body, config);
  return response.data.data;
}

export async function patch<T>(path: string, body?: unknown, config: RequestOptions = {}): Promise<T> {
  const response = await http.patch<ApiSuccessResponse<T>>(path, body, config);
  return response.data.data;
}

export async function remove(path: string, config: RequestOptions = {}): Promise<void> {
  await http.delete(path, config);
}

export { ApiError } from '@/services/api-error';

export type {
  AuthenticatedUser,
  LoginResponse,
  Paginated as PaginatedResponse,
  User,
} from '@andon/shared';
