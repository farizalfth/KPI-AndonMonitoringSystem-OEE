#!/usr/bin/env node
/**
 * Database helper for the Andon Monitoring System & OEE.
 *
 *   node scripts/db.mjs schema   apply database/schema.sql  (idempotent)
 *   node scripts/db.mjs seed     apply database/seed.sql    (idempotent)
 *   node scripts/db.mjs reset    drop + recreate the public schema, then schema + seed
 *   node scripts/db.mjs status   list tables and row counts
 *
 * The connection string is read from backend/.env (DATABASE_URL) so the same
 * value is used by the API, the tests and this script. Works with a local
 * docker-compose PostgreSQL as well as with NeonDB.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const databaseDir = join(rootDir, 'database');

dotenv.config({ path: join(rootDir, 'backend', '.env'), quiet: true });
dotenv.config({ path: join(rootDir, '.env'), quiet: true });

const TABLES = [
  'roles',
  'users',
  'shifts',
  'items',
  'machines',
  'abnormalities',
  'defects',
  'production_setups',
  'work_orders',
  'work_order_items',
  'production_logs',
  'downtime_logs',
  'oee_records',
];

function connectionString() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error(
      '\nDATABASE_URL is not set.\n' +
        '  - local:   copy backend/.env.example to backend/.env and run `docker compose up -d db`\n' +
        '  - NeonDB:  paste the pooled connection string from the Neon console\n',
    );
    process.exit(1);
  }
  return url;
}

async function withClient(fn) {
  const client = new pg.Client({
    connectionString: connectionString(),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    application_name: 'andon-db-script',
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function applyFile(client, fileName) {
  const sql = await readFile(join(databaseDir, fileName), 'utf8');
  console.log(`> applying ${fileName}`);
  await client.query(sql);
  console.log(`  ${fileName} applied`);
}

const commands = {
  async schema() {
    await withClient((client) => applyFile(client, 'schema.sql'));
  },

  async seed() {
    await withClient((client) => applyFile(client, 'seed.sql'));
  },

  async reset() {
    await withClient(async (client) => {
      console.log('> dropping public schema');
      await client.query('DROP SCHEMA IF EXISTS public CASCADE');
      await client.query('CREATE SCHEMA public');
      await applyFile(client, 'schema.sql');
      await applyFile(client, 'seed.sql');
    });
  },

  async status() {
    await withClient(async (client) => {
      const { rows } = await client.query(
        `SELECT table_name
           FROM information_schema.tables
          WHERE table_schema = 'public'
          ORDER BY table_name`,
      );
      const existing = new Set(rows.map((row) => row.table_name));
      console.log('tables in schema "public":');
      for (const table of TABLES) {
        if (!existing.has(table)) {
          console.log(`  - ${table.padEnd(20)} MISSING`);
          continue;
        }
        const count = await client.query(
          `SELECT count(*)::text AS count FROM ${table}`,
        );
        console.log(`  - ${table.padEnd(20)} ${count.rows[0]?.count ?? '0'} rows`);
      }
    });
  },
};

const command = process.argv[2] ?? 'schema';

if (!Object.hasOwn(commands, command)) {
  console.error(`unknown command "${command}". available: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}

commands[command]()
  .then(() => {
    console.log('done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('database script failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });