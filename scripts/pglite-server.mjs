/**
 * Zero-install PostgreSQL for local development.
 *
 * Boots PGlite (PostgreSQL compiled to WebAssembly) and serves it over the
 * PostgreSQL wire protocol, so `node-postgres` (and therefore the whole
 * backend) connects to it with an ordinary `DATABASE_URL`. Use this when
 * Docker, a local PostgreSQL server or NeonDB is unavailable.
 *
 *   node scripts/pglite-server.mjs            # tcp://127.0.0.1:54329/postgres
 *   node scripts/pglite-server.mjs --port 5433 --fresh
 *
 * The data directory is git-ignored (`.pglite/`). Schema and seed are applied
 * automatically on first start and are idempotent, so restarting is safe.
 */
import { mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};

const port = Number(flag('port', process.env.PGLITE_PORT ?? 54329));
const host = flag('host', '127.0.0.1');
const dataDir = resolve(root, flag('data-dir', '.pglite'));
const fresh = args.includes('--fresh');

if (fresh) {
  await rm(dataDir, { recursive: true, force: true });
  console.log(`[pglite] removed ${dataDir}`);
}

await mkdir(dataDir, { recursive: true });

const db = await PGlite.create({ dataDir });
await db.waitReady;

for (const file of ['schema.sql', 'seed.sql']) {
  const sql = await readFile(resolve(root, 'database', file), 'utf8');
  await db.exec(sql);
  console.log(`[pglite] applied database/${file}`);
}

const server = new PGLiteSocketServer({ db, port, host, inspect: false });

// A second `npm run db:server` should say what to do instead of dumping a
// net.listen stack trace.
process.on('uncaughtException', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(
      `[pglite] Port ${port} is already in use — a local database is probably already running.\n` +
        `[pglite] Reuse it, or stop it first (pkill -f pglite-server), or pass --port <other>.`,
    );
    process.exit(1);
  }
  throw error;
});

await server.start();
console.log(`[pglite] PostgreSQL wire protocol ready at tcp://${host}:${port}/postgres`);
console.log(`[pglite] set DATABASE_URL=postgres://postgres@${host}:${port}/postgres`);
console.log('[pglite] press Ctrl+C to stop');

const shutdown = async () => {
  await server.stop();
  await db.close();
  console.log('\n[pglite] stopped');
  process.exit(0);
};

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
