/**
 * REST paths, kept in one place so the frontend cannot drift from the contract
 * in `docs/api.md` (verified by `tests/paths.test.ts`).
 *
 * Master data resources are mounted at the API root, e.g. `/api/machines` —
 * not `/api/masterdata/machines`. The `/masterdata/...` paths you see in the
 * router are SPA routes and are unrelated to these URLs.
 */
export const API_PATHS = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
    logout: '/auth/logout',
  },
  masterdata: {
    users: '/users',
    roles: '/roles',
    shifts: '/shifts',
    items: '/items',
    machines: '/machines',
    abnormalities: '/abnormalities',
    defects: '/defects',
    'production-setups': '/production-setups',
  },
} as const;

/** Resource slugs as used in URLs and by the `CrudPage` `resource` prop. */
export type MasterdataResource = keyof typeof API_PATHS.masterdata;

/**
 * Resolve a resource slug to its API path, relative to the `/api` baseURL:
 * `masterdataPath('machines')` -> `/machines`.
 */
export function masterdataPath(resource: MasterdataResource | string): string {
  return API_PATHS.masterdata[resource as MasterdataResource] ?? `/${resource}`;
}
