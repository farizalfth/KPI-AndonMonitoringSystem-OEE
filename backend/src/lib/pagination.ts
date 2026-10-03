import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type PageQuery } from '@andon/shared';

/** Normalised, safe list query used by every repository. */
export interface NormalisedPageQuery {
  page: number;
  limit: number;
  offset: number;
  search?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

export function normalisePageQuery(query: PageQuery): NormalisedPageQuery {
  const page = Math.max(1, Math.trunc(Number(query.page ?? DEFAULT_PAGE)) || DEFAULT_PAGE);
  const requestedLimit = Math.trunc(Number(query.limit ?? DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE;
  const limit = Math.min(Math.max(1, requestedLimit), MAX_PAGE_SIZE);

  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';
  const search = query.search?.trim();

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    ...(search ? { search } : {}),
    ...(query.sortBy ? { sortBy: query.sortBy } : {}),
    sortOrder,
  };
}

export function buildMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

/**
 * Identifiers come from the URL, so they are validated here once instead of
 * being trusted as raw strings in SQL.
 */
export function assertUuid(value: string, field = 'id'): string {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(value)) {
    throw new Error(`Invalid ${field}: expected a UUID`);
  }
  return value;
}