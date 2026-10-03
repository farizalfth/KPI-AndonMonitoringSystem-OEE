import { types, Pool, type PoolClient, type QueryResultRow } from 'pg';

import { env } from './env';
import { AppError } from '../lib/errors';
import { logger } from './logger';

/**
 * PostgreSQL access layer (works with a local docker-compose instance, with
 * NeonDB and with an injected executor used by the integration tests).
 *
 * One shared pool per process. Type parsers are normalised so NUMERIC/DATE
 * values behave identically on every driver.
 */

// NUMERIC -> number (OEE ratios, cycle times)
types.setTypeParser(1700, (value) => Number.parseFloat(value));
// INT8 (bigint/count) -> number
types.setTypeParser(20, (value) => Number.parseInt(value, 10));
// DATE -> 'YYYY-MM-DD' (never shifted by the local timezone)
types.setTypeParser(1082, (value) => value);

/** Minimal contract shared by `pg.Pool` and the test executor. */
export interface QueryResultLike<T> {
  rows: T[];
  rowCount: number | null;
}

export interface DatabaseExecutor {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[],
  ): Promise<QueryResultLike<T>>;
}

export interface DatabaseClient extends DatabaseExecutor {
  release(): void;
}

export interface DatabasePool extends DatabaseExecutor {
  connect(): Promise<DatabaseClient>;
  end?(): Promise<void>;
}

let pool: DatabasePool | null = null;
let injectedPool: DatabasePool | null = null;

/**
 * Injects a database executor (used by the PGlite integration tests so the
 * suite can run against real PostgreSQL without a server).
 */
export function setDatabasePool(executor: DatabasePool | null): void {
  injectedPool = executor;
}

function createPgPool(): DatabasePool {
  return new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DB_POOL_MAX,
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined,
    application_name: 'andon-oee-backend',
  }) as unknown as DatabasePool;
}

function getPool(): DatabasePool {
  if (injectedPool) return injectedPool;

  if (!env.DATABASE_URL) {
    throw new AppError(
      'DATABASE_URL is not configured. Copy backend/.env.example to backend/.env and set it.',
      500,
      'DATABASE_NOT_CONFIGURED',
    );
  }

  if (!pool) {
    const created = createPgPool();
    (created as unknown as Pool).on('error', (error: unknown) => {
      logger.error({ err: error }, 'unexpected error on idle database client');
    });
    pool = created;
  }

  return pool;
}

/** Run a parameterised query. Never build SQL by string concatenation. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const startedAt = Date.now();
  try {
    const result = await getPool().query<T>(text, params);
    logger.debug({ durationMs: Date.now() - startedAt, rows: result.rowCount }, 'sql');
    return result.rows;
  } catch (error) {
    logger.error({ err: error, durationMs: Date.now() - startedAt }, 'query failed');
    throw error;
  }
}

/** Same as `query` but returns the first row (or null). */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run `fn` inside a transaction; rolls back on any error. */
export async function withTransaction<T>(fn: (client: DatabaseClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Typed helpers for use inside a transaction. */
export const tx = {
  query: async <T extends QueryResultRow = QueryResultRow>(
    client: DatabaseClient,
    text: string,
    params: readonly unknown[] = [],
  ): Promise<T[]> => (await client.query<T>(text, params)).rows,

  queryOne: async <T extends QueryResultRow = QueryResultRow>(
    client: DatabaseClient,
    text: string,
    params: readonly unknown[] = [],
  ): Promise<T | null> => {
    const rows = (await client.query<T>(text, params)).rows;
    return rows[0] ?? null;
  },
};

/**
 * Liveness probe used by `/api/ready` and by the boot check in `server.ts`.
 * It intentionally bypasses the query logger: a missing database is a
 * configuration state, not a query error worth an ERROR log line.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await getPool().query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  if (injectedPool) {
    await injectedPool.end?.();
    injectedPool = null;
    return;
  }
  if (!pool) return;
  await pool.end?.();
  pool = null;
}

export type { PoolClient };