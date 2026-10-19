<div align="center">

# Andon Monitoring System & OEE

**Production monitoring, real-time Andon board and OEE analytics in one system.**

[![Node](https://img.shields.io/badge/Node-%3E%3D20.19-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?style=flat-square&logo=vuedotjs)](https://vuejs.org)
[![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/license-MIT-c2e0c5?style=flat-square)](#license)

[Docs · API contract](docs/api.md) · [Architecture](docs/architecture.md) · [Database](docs/database.md) · [Collaboration](docs/collaboration.md)

</div>

---

## Why one repository?

Andon monitoring and OEE calculation are not separate products: the downtime an
operator reports on the shop floor _is_ the input that makes availability
meaningful, and the machine status on the Andon board _is_ the last production
event. Splitting them into four projects would mean four databases, duplicated
master data and hand-written glue code. This repository keeps one database, one
API contract and one permission model, and splits the work by module instead.

```
┌────────────────┐      REST / Socket.IO       ┌────────────────┐      ┌────────────────┐
│    Frontend    │ ──────────────────────────▶ │    Backend     │ ───▶ │   PostgreSQL   │
│   Vue 3 + TS   │                             │  Express + TS  │      │  NeonDB / SQL  │
└────────────────┘                             └────────────────┘      └────────────────┘
        ▲                                             │
        └────────── Andon board (Socket.IO) ◀───┐    └──▶ MQTT broker (operator events)
```

## Implemented modules

| Phase | Module                          | Status                               |
| ----- | ------------------------------- | ------------------------------------ |
| 1     | Foundation, shared contract, DB | ✅ Done                              |
| 2     | Auth, RBAC, Master Data CRUD    | ✅ Done                              |
| 3     | Work Order + approval           | 🚧 Contract agreed in `docs/api.md`  |
| 4     | Operator, MQTT, downtime, OEE   | 🚧 Contract agreed, routes pre-wired |
| 5     | Andon board (Socket.IO)         | 🚧 Route + guard in place            |
| 6     | Analytics & reporting           | 🚧 Route + guard in place            |

### What works today

- **Authentication** — JWT login, bcrypt password hashing, session restore via
  `GET /api/auth/me`, permission re-derived from the role on every request.
- **RBAC** — one permission matrix in `shared/`; the same function guards the
  API and drives menu visibility in the UI.
- **Master Data** — full CRUD for machines, items, shifts, roles, defects,
  abnormalities, production setups and users, with validation, search,
  pagination, referential-integrity guards and an "edit only when active" rule
  for master data.
- **Referential integrity as a feature** — deleting a machine that is still used
  by a work order returns `409 CONFLICT`, and PostgreSQL `RESTRICT` violations
  are translated into readable API errors.
- **Auditable OEE model** — `oee_records` stores every calculation input
  (`planned_minutes`, `run_minutes`, `downtime_minutes`, `total_units`,
  `good_units`, `ideal_cycle_time`) plus foreign keys to the source logs, so any
  KPI can be recomputed and explained.
- **No fake data** — the seed ships master data and demo work orders only.
  Production logs, downtime logs and OEE records start empty on purpose, so
  every number in the app comes from a real operator action.

## Tech stack

| Layer    | Choice                                                                           |
| -------- | -------------------------------------------------------------------------------- |
| Frontend | Vue 3, Vite 6, TypeScript, Vue Router, Pinia, Tailwind CSS 3, axios, Chart.js    |
| Backend  | Node.js 20+, Express 4, TypeScript (CommonJS), Zod, jsonwebtoken, bcryptjs, Pino |
| Database | PostgreSQL 14+ / NeonDB, `pg` driver, PGlite for integration tests               |
| Realtime | MQTT (broker events), Socket.IO (Andon board)                                    |
| Tooling  | npm workspaces, ESLint 9, Prettier, Vitest, vue-tsc                              |

## Quick start

**Prerequisites:** Node.js `>= 20.19` and npm 10+. A PostgreSQL database is
required too — use Docker, a free NeonDB branch, or the bundled zero-install
PGlite server (no Docker needed, see below).

```bash
# 1. Install every workspace (postinstall builds @andon/shared automatically)
npm install

# 2. Configure the environment
cp backend/.env.example backend/.env      # set DATABASE_URL and JWT_SECRET
cp frontend/.env.example frontend/.env    # optional, dev proxy is the default
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"  # JWT_SECRET

# 3. Prepare the database (idempotent, safe to re-run)
npm run db:schema
npm run db:seed
npm run db:status

# 4. Run API + web together
npm run dev
```

- API → <http://localhost:4000> (`/api/health`, `/api/health/ready`)
- Web → <http://localhost:5173> (Vite proxies `/api` to the backend, so no CORS
  setup is needed in development)

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### No Docker? Run PostgreSQL in-process

`scripts/pglite-server.mjs` boots [PGlite](https://pglite.dev) (PostgreSQL
compiled to WebAssembly) and serves it over the PostgreSQL wire protocol, so the
backend connects to it with an ordinary `DATABASE_URL`. Nothing to install and no
external account:

```bash
npm run db:server               # tcp://127.0.0.1:54329/postgres, schema + seed applied
```

```bash
# backend/.env
DATABASE_URL=postgres://postgres@127.0.0.1:54329/postgres
DB_SSL=false
```

Leave it running in its own terminal and start the app with `npm run dev`. The
data directory is `.pglite/` (git-ignored); `npm run db:server -- --fresh`
starts over from an empty database. The integration tests use the same engine
in-process, so behaviour matches what you develop against.

With Docker instead:

```bash
docker compose up -d postgres   # schema + seed are mounted as init scripts
```

### Demo accounts

| Email                    | Password       | Role       | Can do                                  |
| ------------------------ | -------------- | ---------- | --------------------------------------- |
| `admin@example.com`      | `Password123!` | ADMIN      | Everything, including user management   |
| `supervisor@example.com` | `Password123!` | SUPERVISOR | Master data read, work orders, approval |
| `operator@example.com`   | `Password123!` | OPERATOR   | Master data read, execute production    |

> Rotate every demo password before deploying anywhere real.

## Project structure

```
.
├── shared/      @andon/shared — enums, permission matrix, DTOs, realtime contracts
├── backend/     Express + TypeScript API
│   ├── src/config/       env (Zod), database pool, transactions, logger
│   ├── src/lib/          errors, pagination, validation helpers
│   ├── src/middleware/   authenticate, requirePermission, validate, error handler
│   ├── src/models/       generic repository + user model
│   ├── src/modules/      auth, masterdata (+ users)
│   ├── src/mqtt/         MQTT contract + consumer (Phase 4)
│   └── src/websocket/    Socket.IO contract + gateway (Phase 5)
├── frontend/    Vue 3 + Vite application
│   ├── src/components/   reusable UI (DataTable, BaseModal, StatusBadge, …)
│   ├── src/modules/      feature folders (masterdata + placeholders per owner)
│   ├── src/services/     axios instance, ApiError, token storage, REST paths
│   ├── src/stores/       Pinia auth store
│   └── src/views/        Login, Dashboard, Forbidden, NotFound, Placeholder
├── database/    schema.sql (13 tables), seed.sql, structure notes
├── scripts/     db.mjs — schema | seed | reset | status; pglite-server.mjs — local DB
└── docs/        api.md, architecture.md, database.md, collaboration.md
```

The Master Data UI is **data-driven**: `CrudPage.vue` implements list, search,
pagination, validation, save and delete once, and each of the eight master data
pages only declares its columns and form fields.

## Scripts

| Command                          | Purpose                               |
| -------------------------------- | ------------------------------------- |
| `npm run dev`                    | API + web concurrently                |
| `npm run build`                  | Build shared → backend → frontend     |
| `npm run typecheck`              | Type-check all three workspaces       |
| `npm run lint`                   | ESLint backend + frontend             |
| `npm test`                       | 91 backend tests + 9 frontend tests   |
| `npm run db:schema` / `db:seed`  | Apply schema / seed (both idempotent) |
| `npm run db:server`              | Local PGlite PostgreSQL (no Docker)   |
| `npm run db:reset` / `db:status` | Drop + recreate / inspect tables      |
| `npm run format`                 | Prettier                              |

## Testing

```bash
npm test
```

- **Backend:** Vitest + Supertest — validation, RBAC, auth, master data and a
  health suite, plus an integration suite that boots **PGlite** (PostgreSQL
  compiled to WebAssembly) to apply the real `schema.sql` and `seed.sql` and run
  the real queries. That means CI verifies the DDL, the seed idempotency, the
  unique/foreign-key behaviour and the numeric/date type parsing without needing
  a database server.
- **Frontend:** Vitest — permission-aware navigation and API error/token
  handling.

Type parsing is part of the contract: `NUMERIC` and `DATE` columns are asserted
as `number` and `'YYYY-MM-DD'` so the JSON the API returns matches what the
frontend expects.

## API conventions

Every endpoint follows the same envelope, so clients only need one code path:

```jsonc
// success
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 25, "total": 3, "totalPages": 1 } }

// error
{ "success": false, "error": { "code": "CONFLICT", "message": "…", "details": { } } }
```

`data`/`error` shape and status codes are derived from PostgreSQL SQLSTATE where
possible (`23505`, `23503`, `23001`, `23502`, `23514`, `22P02`, `22001`).
Full endpoint reference: [`docs/api.md`](docs/api.md).

## Deployment

| Piece    | Target                          | Notes                                                         |
| -------- | ------------------------------- | ------------------------------------------------------------- |
| Frontend | Vercel (`vercel.json` included) | Build at repo root, output `frontend/dist`, SPA rewrites      |
| Backend  | Railway / Render / Fly.io       | `npm run build -w backend`, then `npm start -w backend`       |
| Database | NeonDB                          | Run `db:schema` + `db:seed` once; both scripts are idempotent |

Backend environment variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
`CORS_ORIGIN`, `LOG_LEVEL`, `MQTT_*`, `WEBSOCKET_ENABLED` — see
[`backend/.env.example`](backend/.env.example).

## Documentation

| Document                                         | What it answers                                     |
| ------------------------------------------------ | --------------------------------------------------- |
| [`docs/api.md`](docs/api.md)                     | Every endpoint, permission, MQTT topic, OEE formula |
| [`docs/architecture.md`](docs/architecture.md)   | Module boundaries, request flow, deployment         |
| [`docs/database.md`](docs/database.md)           | Schema decisions and why they were made             |
| [`docs/collaboration.md`](docs/collaboration.md) | Module ownership, Git flow, definition of done      |

## License

MIT — see [`LICENSE`](LICENSE).
