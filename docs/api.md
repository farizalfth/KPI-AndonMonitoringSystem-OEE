# API Contract

Base URL: `http://localhost:4000/api`
All request and response bodies are JSON. Every response uses the same envelope.

**This document is a coordinated file.** Change it through a PR before
implementing, and bump `API_CONTRACT_VERSION` in `shared/src/index.ts` on
breaking changes.

---

## 1. Response envelope

Success:

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

`meta` is only present on list endpoints.

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "email", "message": "Invalid email" }]
  }
}
```

### Error codes

| HTTP | `code`                    | Meaning                                                                                 |
| ---- | ------------------------- | --------------------------------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`        | Body / query / param validation failed, `details` lists the fields                      |
| 400  | `BAD_REQUEST`             | Malformed request that is not a schema violation                                        |
| 401  | `UNAUTHENTICATED`         | Missing or invalid/expired access token                                                 |
| 401  | `INVALID_CREDENTIALS`     | Wrong email or password                                                                 |
| 403  | `FORBIDDEN`               | Authenticated but missing the required permission                                       |
| 404  | `NOT_FOUND`               | Resource does not exist                                                                 |
| 409  | `CONFLICT`                | Unique violation / invalid state transition (e.g. duplicate machine code)               |
| 422  | `BUSINESS_RULE_VIOLATION` | The request is valid but breaks a domain rule (e.g. producing on a rejected work order) |
| 500  | `INTERNAL_ERROR`          | Unexpected error, details are logged server side only                                   |

### Authentication

All endpoints require `Authorization: Bearer <accessToken>` **except**
`POST /api/auth/login` and the health endpoints.

### Permissions

`shared/src/constants/permissions.ts` is the single source of truth:

| Permission           | ADMIN | SUPERVISOR | OPERATOR |
| -------------------- | :---: | :--------: | :------: |
| `masterdata:read`    |  ✅   |     ✅     |    ✅    |
| `masterdata:write`   |  ✅   |     –      |    –     |
| `users:manage`       |  ✅   |     –      |    –     |
| `workorder:read`     |  ✅   |     ✅     |    ✅    |
| `workorder:write`    |  ✅   |     ✅     |    –     |
| `workorder:approve`  |  ✅   |     ✅     |    –     |
| `production:execute` |  ✅   |     ✅     |    ✅    |
| `andon:view`         |  ✅   |     ✅     |    ✅    |
| `analytics:view`     |  ✅   |     ✅     |    –     |

The backend enforces this with `requirePermission(...)`; hiding a menu item in
the frontend is **not** a security measure.

### Pagination & sorting

All list endpoints accept:

| Param       | Type            | Default          | Notes                                               |
| ----------- | --------------- | ---------------- | --------------------------------------------------- |
| `page`      | number          | 1                | 1-based                                             |
| `limit`     | number          | 20               | max 200                                             |
| `search`    | string          | –                | free text on the searchable columns of the resource |
| `sortBy`    | string          | resource default | must be one of the documented column names          |
| `sortOrder` | `asc` \| `desc` | `asc`            |                                                     |

---

## 2. Auth — member 1 (`backend/src/modules/auth`)

### `POST /api/auth/login`

Body: `{ "email": "admin@example.com", "password": "Password123!" }`

`200` →

```json
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "tokenType": "Bearer",
    "expiresIn": 28800,
    "user": {
      "id": "…",
      "email": "admin@example.com",
      "fullName": "Andon Admin",
      "roleId": "…",
      "roleCode": "ADMIN",
      "roleName": "Administrator",
      "isActive": true,
      "lastLoginAt": null,
      "createdAt": "…",
      "updatedAt": "…",
      "permissions": [
        "masterdata:read",
        "masterdata:write",
        "users:manage",
        "…"
      ]
    }
  }
}
```

`401 INVALID_CREDENTIALS` when the email/password pair is wrong **or** the
account is inactive (the response is identical to avoid account enumeration).

### `GET /api/auth/me`

Authenticated. Returns the same `user` object as login, **including
`permissions`** (`AuthenticatedUser` in `@andon/shared`). The permissions are
re-derived from `users.role_id -> roles.base_role` on every call, so a role
change takes effect on the next request without re-login. The frontend calls
this endpoint on boot to rebuild its navigation after a page reload.

### `POST /api/auth/logout`

Authenticated. Always `204`. The API is stateless: the client drops the token.
Use `POST /api/auth/change-password` to invalidate access by rotating the
password.

---

## 3. Masterdata — member 1 (`backend/src/modules/masterdata`)

All resources below are **generic**: the same five routes exist for
`shifts`, `items`, `machines`, `abnormalities`, `defects`, `production-setups`
and `roles`. They share pagination, sorting, search and the same envelope.

| Method   | Path                | Permission         | Description                         |
| -------- | ------------------- | ------------------ | ----------------------------------- |
| `GET`    | `/api/machines`     | `masterdata:read`  | List + paginate                     |
| `POST`   | `/api/machines`     | `masterdata:write` | Create                              |
| `GET`    | `/api/machines/:id` | `masterdata:read`  | Detail                              |
| `PUT`    | `/api/machines/:id` | `masterdata:write` | Update (partial)                    |
| `DELETE` | `/api/machines/:id` | `masterdata:write` | Delete, `409` when still referenced |

Extra query parameters supported by every resource: `isActive=true|false`.

### Resources and columns

| Resource          | Path                     | Columns (request body)                                                     |
| ----------------- | ------------------------ | -------------------------------------------------------------------------- |
| Roles             | `/api/roles`             | `code`, `name`, `description?`, `baseRole?`                                |
| Users             | `/api/users`             | `email`, `password`, `fullName`, `roleId`, `isActive?`                     |
| Shifts            | `/api/shifts`            | `code`, `name`, `startTime`, `endTime`, `plannedMinutes?`, `description?`  |
| Items             | `/api/items`             | `code`, `name`, `category?`, `unit?`, `standardCycleTime?`, `description?` |
| Machines          | `/api/machines`          | `code`, `name`, `area?`, `defaultCycleTime?`, `description?`               |
| Abnormalities     | `/api/abnormalities`     | `code`, `name`, `category`, `isPlanned?`, `defaultDurationMinutes?`        |
| Defects           | `/api/defects`           | `code`, `name`, `defectType?`, `description?`                              |
| Production setups | `/api/production-setups` | `code`, `name`, `itemId?`, `machineId?`, `setupMinutes`, `description?`    |

`users` is hand written (password hashing, role resolution) and adds
`PUT /api/users/:id` (partial update, `password` optional) and
`POST /api/users/:id/reset-password`.

Examples:

```
GET    /api/machines?search=MC&isActive=true&sortBy=code&sortOrder=asc
POST   /api/items        { "code": "ITEM-D", "name": "Product D", "standardCycleTime": 9.5 }
PUT    /api/machines/:id { "name": "Injection Molding 1 (rev B)" }
DELETE /api/defects/:id
```

---

## 4. Work Order — member 2 (`backend/src/modules/workorder`)

| Method   | Path                           | Permission          | Description                                                                                 |
| -------- | ------------------------------ | ------------------- | ------------------------------------------------------------------------------------------- |
| `GET`    | `/api/work-orders`             | `workorder:read`    | List, filter `status`, `periodType`, `machineId`, `itemId`, `shiftId`, `dateFrom`, `dateTo` |
| `POST`   | `/api/work-orders`             | `workorder:write`   | Create (`DRAFT` or `PENDING_APPROVAL`)                                                      |
| `GET`    | `/api/work-orders/:id`         | `workorder:read`    | Detail incl. item lines and progress                                                        |
| `PUT`    | `/api/work-orders/:id`         | `workorder:write`   | Update (only while `DRAFT`/`PENDING_APPROVAL`)                                              |
| `DELETE` | `/api/work-orders/:id`         | `workorder:write`   | Delete while `DRAFT`                                                                        |
| `POST`   | `/api/work-orders/:id/submit`  | `workorder:write`   | `DRAFT` → `PENDING_APPROVAL`                                                                |
| `POST`   | `/api/work-orders/:id/approve` | `workorder:approve` | `PENDING_APPROVAL` → `APPROVED`                                                             |
| `POST`   | `/api/work-orders/:id/reject`  | `workorder:approve` | `PENDING_APPROVAL` → `REJECTED`, body `{ "reason": "…" }`                                   |
| `GET`    | `/api/work-orders/assignable`  | `workorder:read`    | Approved work orders the operator may start                                                 |

State machine:

```
DRAFT ──submit──► PENDING_APPROVAL ──approve──► APPROVED ──first event──► RUNNING ──target reached──► COMPLETED
   ▲                       │
   └────── reject ─────────┴──► REJECTED ──(edit)──► DRAFT
APPROVED / RUNNING ──cancel──► CANCELLED
```

---

## 5. Production — member 2 (`backend/src/modules/production`)

Every action writes **exactly one** `production_logs` row. `BREAK`,
`ABNORMALITY` and `SETUP` additionally open a `downtime_logs` interval
(`POST /api/production/downtime/:id/close` closes it). All routes require
`production:execute`. Every response is:

```json
{ "success": true, "data": { "log": { }, "downtimeLog": { } | null, "machine": { } } }
```

| Method | Path                                 | Body                                                                                                | Effect                                                         |
| ------ | ------------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `POST` | `/api/production/start-shift`        | `{ machineId, workOrderId }`                                                                        | `START_SHIFT` log, machine → `RUNNING`, work order → `RUNNING` |
| `POST` | `/api/production/produce`            | `{ machineId, workOrderId, cycleTimeSeconds?, idealCycleTimeSeconds?, occurredAt? }`                | `PRODUCE` log (`result=OK`), machine stays `RUNNING`           |
| `POST` | `/api/production/ng`                 | `{ machineId, workOrderId, defectId, cycleTimeSeconds? }`                                           | `NG` log, machine stays `RUNNING`                              |
| `POST` | `/api/production/abnormality`        | `{ machineId, workOrderId, abnormalityId, startTime?, remarks? }`                                   | `ABNORMALITY` log + downtime, machine → `DOWN`                 |
| `POST` | `/api/production/break`              | `{ machineId, workOrderId, startTime?, remarks? }`                                                  | `BREAK` log + downtime, machine → `IDLE`                       |
| `POST` | `/api/production/setup`              | `{ machineId, workOrderId, productionSetupId?, startTime?, remarks? }`                              | `SETUP` log + downtime, machine → `SETUP`                      |
| `POST` | `/api/production/finish-shift`       | `{ machineId, workOrderId }`                                                                        | Closes open downtime + `FINISH_SHIFT` log, machine → `IDLE`    |
| `POST` | `/api/production/downtime/:id/close` | `{ endTime?, remarks? }`                                                                            | Closes one downtime interval, machine → `IDLE`                 |
| `GET`  | `/api/production/logs`               | query: `machineId`, `workOrderId`, `shiftId`, `itemId`, `eventType`, `result`, `dateFrom`, `dateTo` | Paginated raw event log                                        |
| `GET`  | `/api/production/downtime`           | query: `machineId`, `reasonType`, `open=true`                                                       | Paginated downtime log                                         |
| `GET`  | `/api/production/machines/:id/state` | –                                                                                                   | Live snapshot used by the Andon board                          |

Errors: producing on a machine without an open shift, or with a work order that
is not `APPROVED`/`RUNNING`, returns `422 BUSINESS_RULE_VIOLATION`.

---

## 6. OEE — member 3 (`backend/src/modules/oee`)

| Method | Path                 | Permission       | Description                                                                                                          |
| ------ | -------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/oee`           | `andon:view`     | Paginated `oee_records`, filter `granularity`, `dateFrom`, `dateTo`, `machineId`, `itemId`, `shiftId`, `workOrderId` |
| `GET`  | `/api/oee/shift`     | `andon:view`     | Latest OEE per shift (`granularity=SHIFT`)                                                                           |
| `GET`  | `/api/oee/daily`     | `andon:view`     | Latest OEE per day (`granularity=DAY`)                                                                               |
| `GET`  | `/api/oee/live`      | `andon:view`     | Recomputed snapshot for the Andon board (today, all machines)                                                        |
| `POST` | `/api/oee/recompute` | `analytics:view` | Force recomputation for a period (idempotent upsert)                                                                 |

Formulas (all inputs persisted in `oee_records`, no random numbers):

```
planned   = shift.planned_minutes * 60
downtime  = sum(downtime_logs.duration_seconds)   (planned downtime excluded)
run       = planned - downtime
ideal     = total_output * ideal_cycle_time_seconds
availability = run / planned
performance  = ideal / run
quality      = ok_count / total_output
oee          = availability * performance * quality      (stored as 0..1)
```

---

## 7. Production Analytics — member 4 (`backend/src/modules/analytics`)

Shared filters: `dateFrom`, `dateTo` (ISO dates, required),
`shiftId?`, `machineId?`, `itemId?`.

| Method | Path                          | Returns                                                       |
| ------ | ----------------------------- | ------------------------------------------------------------- |
| `GET`  | `/api/analytics/kpi`          | `KpiSummary`                                                  |
| `GET`  | `/api/analytics/productivity` | `ProductivityPoint[]` (target vs actual per machine/shift)    |
| `GET`  | `/api/analytics/production`   | `ProductionTrendPoint[]` (per day / shift)                    |
| `GET`  | `/api/analytics/ok-vs-ng`     | `OkVsNgPoint[]`                                               |
| `GET`  | `/api/analytics/defects`      | `ParetoDefectRow[]` (sorted desc + cumulative %)              |
| `GET`  | `/api/analytics/downtime`     | `DowntimeSummaryRow[]` (per reason/category/machine)          |
| `GET`  | `/api/analytics/oee-trend`    | `OeeTrendPoint[]`                                             |
| `GET`  | `/api/analytics/dashboard`    | Everything above in one call (single round trip for the page) |

All numbers are aggregated from `production_logs` / `downtime_logs` /
`oee_records` — never hard coded.

---

## 8. Realtime & MQTT contracts

### WebSocket (Socket.IO) — member 3

Namespace `/andon`, path `/socket.io`. Events pushed to the browser:

| Event               | Payload                                        | Triggered by                 |
| ------------------- | ---------------------------------------------- | ---------------------------- |
| `production:update` | `MachineStatusUpdate`                          | every `PRODUCE` / `NG` event |
| `machine:status`    | `MachineStatusUpdate`                          | every status transition      |
| `oee:update`        | `OeeSnapshot`                                  | after OEE recomputation      |
| `downtime:update`   | `DowntimeLog`                                  | downtime opened / closed     |
| `quality:update`    | `{ machineId, okCount, ngCount, qualityRate }` | `NG` events                  |

Client → server: `subscribe` with `{ machineIds: string[] }` to limit the
traffic of a large board.

### MQTT topics — member 2 (publish) / member 3 (subscribe)

Root: `production/machine` (configurable via `MQTT_TOPIC_ROOT`).

| Topic                                          | Payload                                                |
| ---------------------------------------------- | ------------------------------------------------------ |
| `production/machine/{machineCode}/produce`     | `MqttProductionEvent`                                  |
| `production/machine/{machineCode}/ng`          | `MqttProductionEvent` + `defectId`                     |
| `production/machine/{machineCode}/abnormality` | `MqttProductionEvent` + `abnormalityId`                |
| `production/machine/{machineCode}/break`       | `MqttProductionEvent`                                  |
| `production/machine/{machineCode}/setup`       | `MqttProductionEvent`                                  |
| `production/machine/{machineCode}/shift`       | `MqttProductionEvent` (`START_SHIFT` / `FINISH_SHIFT`) |

```json
{
  "machineId": "MC-001",
  "machineCode": "MC-001",
  "workOrderId": "80000000-0000-4000-8000-000000000001",
  "event": "PRODUCE",
  "timestamp": "2026-01-15T08:15:00.000Z",
  "cycleTimeSeconds": 10.4,
  "operatorId": "10000000-0000-4000-8000-000000000003"
}
```

The MQTT handler reuses the exact same service as the REST controller, so an
event produces identical database rows, an identical OEE recomputation and an
identical WebSocket broadcast regardless of its origin (`source` column records
`OPERATOR`, `MQTT` or `API`).

---

## 9. Health

| Method | Path                | Description                                                   |
| ------ | ------------------- | ------------------------------------------------------------- |
| `GET`  | `/api/health`       | `{ status: 'ok', database: 'up' \| 'down', uptime, version }` |
| `GET`  | `/api/health/ready` | `503` when the database is unreachable                        |
