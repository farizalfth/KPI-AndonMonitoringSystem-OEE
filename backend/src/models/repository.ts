import type { PaginationMeta, PageQuery } from '@andon/shared';

import { query, queryOne } from '../config/db';
import { buildMeta, normalisePageQuery } from '../lib/pagination';
import { notFound } from '../lib/errors';

/**
 * Small, explicit repository factory shared by every masterdata resource.
 *
 * Design rules
 *  - table names, column names and sort keys come from *code*, never from the
 *    request, so the generated SQL cannot be injected;
 *  - values are always bound as parameters;
 *  - columns are aliased to camelCase in SQL, which removes the need for a
 *    hand written row mapper for every entity.
 */
export interface RepositoryDefinition<T> {
  /** Physical table name. */
  table: string;
  /** Table (or query) alias used to qualify columns. */
  alias: string;
  /** Writable/filterable fields: camelCase API field -> database column. */
  fields: Record<string, string>;
  /** Columns that are always selected (id + audit columns). */
  baseFields?: Record<string, string>;
  /** Additional SELECT expressions, e.g. `i.name AS "itemName"`. */
  extraSelect?: string;
  /** Optional FROM suffix with joins, must not repeat the table alias. */
  joins?: string;
  /** Fields used by the `search` query parameter. */
  searchable?: string[];
  /** Allowed values for `sortBy` (defaults to every field). */
  sortable?: string[];
  defaultSort?: string;
  defaultSortOrder?: 'asc' | 'desc';
  /** Optional row mapper for resources that need derived values. */
  map?: (row: Record<string, unknown>) => T;
}

export type FilterValue = string | number | boolean | null | undefined;

export interface ListOptions extends PageQuery {
  filters?: Record<string, FilterValue>;
}

export interface ListResult<T> {
  items: T[];
  meta: PaginationMeta;
}

type Row = Record<string, unknown>;

function quoteAlias(alias: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(alias)) {
    throw new Error(`Unsafe SQL alias: ${alias}`);
  }
  return alias;
}

export function createRepository<T>(definition: RepositoryDefinition<T>) {
  const alias = quoteAlias(definition.alias);
  const fields = definition.fields;
  const baseFields: Record<string, string> = definition.baseFields ?? {
    id: `${alias}.id`,
    createdAt: `${alias}.created_at`,
    updatedAt: `${alias}.updated_at`,
  };

  const allFields = { ...baseFields, ...fields };
  const selectable = [
    ...Object.entries(baseFields).map(([key, column]) => `${column} AS "${key}"`),
    ...Object.entries(fields).map(([key, column]) => `${column} AS "${key}"`),
  ];
  if (definition.extraSelect) selectable.push(definition.extraSelect);

  const from = `FROM ${definition.table} AS ${alias}${definition.joins ? ` ${definition.joins}` : ''}`;

  const sortable = new Set(definition.sortable ?? Object.keys(fields));

  function resolveSort(sortBy?: string): { column: string; direction: 'asc' | 'desc' } {
    const requested = sortBy ?? definition.defaultSort;
    const key = requested && sortable.has(requested) ? requested : (definition.defaultSort ?? 'id');
    const dbColumn = allFields[key] ?? `${alias}.id`;
    return { column: dbColumn, direction: definition.defaultSortOrder ?? 'asc' };
  }

  function buildWhere(options: ListOptions): { clause: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    const search = options.search?.trim();
    if (search && definition.searchable?.length) {
      const pattern = `%${search}%`;
      const searchParts = definition.searchable.map(
        (field) => `${alias}.${fields[field] ?? field} ILIKE $${params.length + 1}`,
      );
      params.push(pattern);
      conditions.push(`(${searchParts.join(' OR ')})`);
    }

    for (const [key, value] of Object.entries(options.filters ?? {})) {
      if (value === undefined || value === null || value === '') continue;
      const column = fields[key];
      if (!column) continue;
      params.push(value);
      conditions.push(`${alias}.${column} = $${params.length}`);
    }

    return {
      clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
      params,
    };
  }

  function mapRows(rows: Row[]): T[] {
    const mapper = definition.map;
    return mapper ? rows.map((row) => mapper(row)) : (rows as T[]);
  }

  async function findByIdInternal(id: string): Promise<T | null> {
    const row = await queryOne<Row>(
      `SELECT ${selectable.join(', ')} ${from} WHERE ${alias}.id = $1 LIMIT 1`,
      [id],
    );
    return row ? (mapRows([row])[0] ?? null) : null;
  }

  return {
    definition,

    async list(options: ListOptions = {}): Promise<ListResult<T>> {
      const { page, limit, offset, search, sortBy, sortOrder } = normalisePageQuery(options);
      const sort = resolveSort(sortBy);
      const direction = sortBy ? sortOrder : (definition.defaultSortOrder ?? sort.direction);
      const where = buildWhere({ ...options, ...(search ? { search } : {}) });

      const params = [...where.params, limit, offset];
      const rows = await query<Row>(
        `SELECT ${selectable.join(', ')} ${from} ${where.clause}
         ORDER BY ${sort.column} ${direction.toUpperCase()}, ${alias}.id ASC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );

      const countRow = await queryOne<{ count: string }>(
        `SELECT count(*)::text AS count ${from} ${where.clause}`,
        [...where.params],
      );

      const total = Number(countRow?.count ?? 0);
      return { items: mapRows(rows), meta: buildMeta(total, page, limit) };
    },

    findById: findByIdInternal,

    async findOneBy(field: string, value: unknown, options: { excludeId?: string } = {}): Promise<T | null> {
      const column = fields[field];
      if (!column) throw new Error(`Field "${field}" is not queryable on ${definition.table}`);

      const params: unknown[] = [value];
      let clause = `${alias}.${column} = $1`;
      if (options.excludeId) {
        params.push(options.excludeId);
        clause += ` AND ${alias}.id <> $${params.length}`;
      }

      const row = await queryOne<Row>(
        `SELECT ${selectable.join(', ')} ${from} WHERE ${clause} LIMIT 1`,
        params,
      );
      return row ? (mapRows([row])[0] ?? null) : null;
    },

    async create(data: Record<string, unknown>): Promise<T> {
      const entries = Object.entries(data).filter(
        ([key, value]) => value !== undefined && fields[key] !== undefined,
      );
      if (entries.length === 0) throw new Error(`No writable fields supplied for ${definition.table}`);

      const columnNames = entries.map(([key]) => fields[key]);
      const values = entries.map(([, value]) => value);
      const placeholders = values.map((_, index) => `$${index + 1}`);

      const row = await queryOne<Row>(
        `INSERT INTO ${definition.table} (${columnNames.join(', ')})
         VALUES (${placeholders.join(', ')})
         RETURNING id`,
        values,
      );

      if (!row) throw new Error(`Insert into ${definition.table} returned no row`);

      // Re-read through the full select so joins/derived columns are included.
      const created = await findByIdInternal(String(row.id));
      if (!created) throw new Error(`Inserted ${definition.table} row could not be read back`);
      return created;
    },

    async update(id: string, data: Record<string, unknown>): Promise<T> {
      const entries = Object.entries(data).filter(
        ([key, value]) => value !== undefined && fields[key] !== undefined,
      );
      if (entries.length === 0) {
        const current = await findByIdInternal(id);
        if (!current) throw notFound(singular(definition.table), id);
        return current;
      }

      const row = await queryOne<Row>(
        `UPDATE ${definition.table}
            SET ${entries.map(([key], index) => `${fields[key]} = $${index + 1}`).join(', ')}
          WHERE id = $${entries.length + 1}
        RETURNING id`,
        [...entries.map(([, value]) => value), id],
      );

      if (!row) throw notFound(singular(definition.table), id);

      const updated = await findByIdInternal(id);
      if (!updated) throw notFound(singular(definition.table), id);
      return updated;
    },

    async remove(id: string): Promise<void> {
      const row = await queryOne<{ id: string }>(
        `DELETE FROM ${definition.table} WHERE id = $1 RETURNING id`,
        [id],
      );
      if (!row) throw notFound(singular(definition.table), id);
    },

    async count(filters: Record<string, FilterValue> = {}): Promise<number> {
      const where = buildWhere({ filters });
      const countRow = await queryOne<{ count: string }>(
        `SELECT count(*)::text AS count ${from} ${where.clause}`,
        where.params,
      );
      return Number(countRow?.count ?? 0);
    },
  };
}

export type Repository<T> = ReturnType<typeof createRepository<T>>;

function singular(table: string): string {
  return table.endsWith('ies')
    ? `${table.slice(0, -3)}y`
    : table.endsWith('s')
      ? table.slice(0, -1)
      : table;
}