/**
 * Access-token storage. Split out of `api.ts` so it can be unit tested without
 * creating an axios instance.
 */
export const ACCESS_TOKEN_STORAGE_KEY = 'andon.accessToken';

export function readAccessToken(): string | null {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Private mode / disabled storage: treat as "no session".
    return null;
  }
}

export function writeAccessToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore quota/permission errors; the session simply won't survive a reload.
  }
}
