import type { AuthenticatedUser, LoginResponse } from '@andon/shared';

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { getOne, post } from '@/services/api';
import { ApiError } from '@/services/api-error';
import { readAccessToken, writeAccessToken } from '@/services/token-storage';

/**
 * Session store.
 *
 * The JWT is kept in localStorage so a page reload (and the Andon board on a
 * plant TV) does not require a new login. The user object is re-validated from
 * `/api/auth/me` on boot, which also rejects tokens of deactivated accounts.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthenticatedUser | null>(null);
  const accessToken = ref<string | null>(readAccessToken());
  const loading = ref(false);
  const initialised = ref(false);

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value));
  const role = computed(() => user.value?.roleCode ?? null);
  const permissions = computed(() => user.value?.permissions ?? []);

  function hasPermission(...required: string[]): boolean {
    if (required.length === 0) return true;
    const granted = permissions.value;
    return required.some((permission) => granted.includes(permission as never));
  }

  function hasRole(...roles: string[]): boolean {
    return role.value !== null && roles.includes(role.value);
  }

  function setSession(token: string, authenticatedUser: AuthenticatedUser): void {
    writeAccessToken(token);
    accessToken.value = token;
    user.value = authenticatedUser;
  }

  function clearSession(): void {
    writeAccessToken(null);
    accessToken.value = null;
    user.value = null;
  }

  async function login(email: string, password: string): Promise<void> {
    loading.value = true;
    try {
      const result = await post<LoginResponse>('/auth/login', { email, password });
      setSession(result.accessToken, result.user);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Login failed', 'UNKNOWN', 0);
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      if (accessToken.value) await post<void>('/auth/logout');
    } catch {
      // A failing logout must never block the local session teardown.
    } finally {
      clearSession();
    }
  }

  /** Restores the session on boot; returns the user or null. */
  async function restore(): Promise<AuthenticatedUser | null> {
    if (!accessToken.value) {
      initialised.value = true;
      return null;
    }

    try {
      const me = await getOne<AuthenticatedUser>('/auth/me');
      user.value = me;
      return me;
    } catch {
      clearSession();
      return null;
    } finally {
      initialised.value = true;
    }
  }

  return {
    user,
    accessToken,
    loading,
    initialised,
    isAuthenticated,
    role,
    permissions,
    hasPermission,
    hasRole,
    login,
    logout,
    restore,
    clearSession,
    setSession,
  };
});