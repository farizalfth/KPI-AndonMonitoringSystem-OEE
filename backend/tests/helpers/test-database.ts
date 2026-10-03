import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';

import { setDatabasePool, type DatabaseClient, type DatabasePool } from '../../src/config/db';

/**
 * Integration test harness.
 *
 * Boots a real PostgreSQL (PGlite — PostgreSQL compiled to WebAssembly) in
 * memory and applies `database/schema.sql` + `database/seed.sql` to it. That
 * means the schema, the seed and the SQL in the repositories are verified
 * against a genuine PostgreSQL engine, without Docker and without a NeonDB
 * account.
 *
 * When `DATABASE_URL` is set, set `ANDON_TEST_DATABASE_URL=1` as well to run
 * the same suite against NeonDB instead.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
/** `backend/tests/helpers` -> repository root */
export const repoRoot = join(__dirname, '..', '..', '..');

export interface TestDatabase {
  pool: DatabasePool;
  applySql(fileName: string): Promise<void>;
  sql(text: string, params?: readonly unknown[]): Promise<{ rows: unknown[] }>;
  close(): Promise<void>;
}

export async function createTestDatabase(options: { fresh?: boolean } = {}): Promise<TestDatabase> {
  const useNeon = process.env.ANDON_TEST_DATABASE_URL === '1' && Boolean(process.env.DATABASE_URL);

  if (useNeon) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
      ssl: { rejectUnauthorized: false },
    }) as unknown as DatabasePool;

    const apply = async (fileName: string) => {
      const sql = await readFile(join(repoRoot, 'database', fileName), 'utf8');
      await pool.query(sql);
    };

    return {
      pool,
      applySql: apply,
      sql: async (text, params = []) => pool.query(text, params as unknown[]),
      close: async () => {
        await pool.end?.();
      },
    };
  }

  const client = new PGlite(options.fresh === false ? undefined : undefined);
  await client.waitReady;

  /**
   * Emulates the `pg` type parsers registered in `src/config/db.ts` so the
   * integration tests observe the same JavaScript types as production:
   *   1700 NUMERIC -> number, 20 INT8 -> number, 1082 DATE -> 'YYYY-MM-DD'.
   */
  const NUMERIC_OID = 1700;
  const INT8_OID = 20;
  const DATE_OID = 1082;

  const normalise = (
    rows: unknown[],
    fields: Array<{ name: string; dataTypeID: number }> | undefined,
  ): unknown[] => {
    if (!fields) return rows;
    return rows.map((row) => {
      const record = { ...(row as Record<string, unknown>) };
      for (const field of fields) {
        const value = record[field.name];
        if (value === null || value === undefined) continue;

        if (field.dataTypeID === NUMERIC_OID || field.dataTypeID === INT8_OID) {
          record[field.name] = Number(value);
        } else if (field.dataTypeID === DATE_OID) {
          const date = value instanceof Date ? value : new Date(String(value));
          record[field.name] = date.toISOString().slice(0, 10);
        }
      }
      return record;
    });
  };

  const runQuery = async (text: string, params: readonly unknown[] = []) => {
    const result = await client.query(text, params as unknown[]);
    const fields = result.fields as unknown as Array<{ name: string; dataTypeID: number }>;
    return {
      rows: normalise(result.rows, fields) as never[],
      rowCount: result.affectedRows ?? result.rows.length,
    };
  };

  const executor: DatabasePool = {
    query: runQuery,
    async connect(): Promise<DatabaseClient> {
      return { query: runQuery, release: () => undefined };
    },
    async end() {
      await client.close();
    },
  };

  const apply = async (fileName: string) => {
    const sql = await readFile(join(repoRoot, 'database', fileName), 'utf8');
    await client.exec(sql);
  };

  return {
    pool: executor,
    applySql: apply,
    sql: async (text, params = []) => executor.query(text, params),
    close: async () => {
      await client.close();
    },
  };
}

/** Boots the database, applies schema + seed and injects it into the app. */
export async function bootstrapTestDatabase(): Promise<TestDatabase> {
  const database = await createTestDatabase();
  await database.applySql('schema.sql');
  await database.applySql('seed.sql');
  setDatabasePool(database.pool);
  return database;
}