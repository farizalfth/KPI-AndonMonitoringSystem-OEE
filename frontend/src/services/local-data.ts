import type { PaginationMeta } from '@andon/shared';
import { MAX_PAGE_SIZE } from '@andon/shared';

import { ApiError } from '@/services/api-error';

/**
 * In-memory "database" that lives in the browser.
 *
 * Two groups of resources use it:
 *
 *  1. **Module demos** (`LOCAL_PATHS`) — work orders, production logs, andon
 *     events and KPI snapshots have no backend yet, so their CRUD always runs
 *     against this store with dummy rows.
 *  2. **Offline fallback** — every other resource first tries the real API (see
 *     `services/resource.ts`) and lands here when the server is unreachable, so
 *     the screens keep working (create / edit / delete included) without a
 *     backend.
 *
 * Rows are persisted in `localStorage`, so edits survive a page reload, and the
 * seed data mirrors `database/seed.sql` (same ids) which keeps foreign keys
 * between resources resolvable in both modes.
 */
export type LocalRow = Record<string, unknown>;

/** Resources that never talk to the API — the module has no endpoints yet. */
export const LOCAL_PATHS = new Set<string>([
  '/work-orders',
  '/production-logs',
  '/andon-events',
  '/kpi-snapshots',
]);

const STORAGE_PREFIX = 'andon:demo-data:v1:';
const caches = new Map<string, LocalRow[]>();

export function isLocalPath(path: string): boolean {
  return LOCAL_PATHS.has(path);
}

/* ------------------------------------------------------------------ */
/* storage helpers                                                     */
/* ------------------------------------------------------------------ */

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function persist(path: string, rows: LocalRow[]): void {
  try {
    storage()?.setItem(STORAGE_PREFIX + path, JSON.stringify(rows));
  } catch {
    // Quota errors (or private browsing) simply mean the demo data is
    // session-only, which is still perfectly usable.
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let idCounter = 0;

function newId(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  idCounter += 1;
  return `local-${Date.now().toString(36)}-${idCounter}`;
}

function load(path: string): LocalRow[] {
  const cached = caches.get(path);
  if (cached) return cached;

  let rows: LocalRow[] | null = null;
  try {
    const raw = storage()?.getItem(STORAGE_PREFIX + path);
    if (raw) rows = JSON.parse(raw) as LocalRow[];
  } catch {
    rows = null;
  }

  if (!rows) {
    rows = seedsFor(path);
    persist(path, rows);
  }

  caches.set(path, rows);
  return rows;
}

/* ------------------------------------------------------------------ */
/* queries                                                             */
/* ------------------------------------------------------------------ */

const QUERY_KEYS = new Set(['page', 'limit', 'search', 'sortBy', 'sortOrder']);

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function isSearchable(value: unknown): boolean {
  return value === null || typeof value !== 'object';
}

export function listLocal<T>(
  path: string,
  params: Record<string, unknown> = {},
): { data: T[]; meta: PaginationMeta } {
  let rows = [...load(path)];

  for (const [key, value] of Object.entries(params)) {
    if (QUERY_KEYS.has(key)) continue;
    if (value === undefined || value === null || value === '') continue;
    rows = rows.filter((row) => String(row[key] ?? '') === String(value));
  }

  const search = String(params.search ?? '')
    .trim()
    .toLowerCase();
  if (search) {
    rows = rows.filter((row) =>
      Object.values(row).filter(isSearchable).some((value) => String(value ?? '').toLowerCase().includes(search)),
    );
  }

  const sortBy = params.sortBy ? String(params.sortBy) : '';
  if (sortBy) {
    const direction = params.sortOrder === 'desc' ? -1 : 1;
    rows.sort((a, b) => compareValues(a[sortBy], b[sortBy]) * direction);
  }

  const total = rows.length;
  const limit = Math.min(
    Math.max(1, Math.trunc(Number(params.limit)) || 20),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(1, Math.trunc(Number(params.page)) || 1);
  const start = (page - 1) * limit;

  return {
    data: rows.slice(start, start + limit).map((row) => ({ ...row })) as T[],
    meta: { page, limit, total, totalPages: limit > 0 ? Math.ceil(total / limit) : 0 },
  };
}

/** Single row lookup used by table cells to resolve foreign keys. */
export function lookupLocal(path: string, id: string): LocalRow | null {
  return load(path).find((row) => row.id === id) ?? null;
}

/* ------------------------------------------------------------------ */
/* mutations                                                           */
/* ------------------------------------------------------------------ */

/** Keeps denormalised columns (`roleCode`, `roleName`, …) in sync on write. */
function enrich(path: string, row: LocalRow): LocalRow {
  if (path !== '/users' || !row.roleId) return row;
  const role = lookupLocal('/roles', String(row.roleId));
  if (!role) return row;
  return { ...row, roleCode: role.code, roleName: role.name };
}

function assertCodeIsFree(path: string, data: LocalRow, excludeId?: string): void {
  const code = data.code;
  if (typeof code !== 'string' || code.trim() === '') return;

  const clash = load(path).some(
    (row) => row.id !== excludeId && String(row.code ?? '').toLowerCase() === code.toLowerCase(),
  );
  if (clash) throw new ApiError(`Code "${code}" already exists`, 'CONFLICT', 409, { field: 'code' });
}

export function createLocal<T>(path: string, body: LocalRow): T {
  const rows = load(path);
  assertCodeIsFree(path, body);

  const now = new Date().toISOString();
  const row: LocalRow = enrich(path, { ...body, id: newId(), createdAt: now, updatedAt: now });
  rows.push(row);
  persist(path, rows);
  return { ...row } as T;
}

export function updateLocal<T>(path: string, id: string, body: LocalRow): T {
  const rows = load(path);
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) throw new ApiError('Record not found', 'NOT_FOUND', 404);

  if (body.code !== undefined) assertCodeIsFree(path, body, id);

  const updated: LocalRow = enrich(path, {
    ...rows[index],
    ...body,
    id,
    updatedAt: new Date().toISOString(),
  });
  rows[index] = updated;
  persist(path, rows);
  return { ...updated } as T;
}

export function removeLocal(path: string, id: string): void {
  const rows = load(path);
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) throw new ApiError('Record not found', 'NOT_FOUND', 404);

  rows.splice(index, 1);
  persist(path, rows);
}

/** Drops every demo resource so the next read seeds it again. */
export function resetLocalData(): void {
  const store = storage();
  const keys: string[] = [];
  if (store) {
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => store.removeItem(key));
  }
  caches.clear();
}

/* ------------------------------------------------------------------ */
/* seed data (mirrors database/seed.sql)                               */
/* ------------------------------------------------------------------ */

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { start: iso(start), end: iso(end) };
}

const SEEDS: Record<string, () => LocalRow[]> = {
  '/roles': () => [
    {
      id: '00000000-0000-4000-8000-000000000001',
      code: 'ADMIN',
      name: 'Administrator',
      description: 'Full access to masterdata, users, roles and every module.',
      baseRole: 'ADMIN',
      isSystem: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      code: 'SUPERVISOR',
      name: 'Supervisor',
      description: 'Creates and approves work orders, monitors Andon and reads analytics.',
      baseRole: 'SUPERVISOR',
      isSystem: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000003',
      code: 'OPERATOR',
      name: 'Operator',
      description: 'Runs the assigned work orders from the operator playground.',
      baseRole: 'OPERATOR',
      isSystem: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
  ],
  '/users': () => [
    {
      id: '10000000-0000-4000-8000-000000000001',
      email: 'admin@example.com',
      fullName: 'Andon Admin',
      roleId: '00000000-0000-4000-8000-000000000001',
      roleCode: 'ADMIN',
      roleName: 'Administrator',
      isActive: true,
      lastLoginAt: '2026-10-01T06:12:00.000Z',
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '10000000-0000-4000-8000-000000000002',
      email: 'supervisor@example.com',
      fullName: 'Budi Santoso',
      roleId: '00000000-0000-4000-8000-000000000002',
      roleCode: 'SUPERVISOR',
      roleName: 'Supervisor',
      isActive: true,
      lastLoginAt: '2026-10-01T05:48:00.000Z',
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '10000000-0000-4000-8000-000000000003',
      email: 'operator@example.com',
      fullName: 'Operator Satu',
      roleId: '00000000-0000-4000-8000-000000000003',
      roleCode: 'OPERATOR',
      roleName: 'Operator',
      isActive: true,
      lastLoginAt: '2026-10-01T05:55:00.000Z',
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '10000000-0000-4000-8000-000000000004',
      email: 'operator2@example.com',
      fullName: 'Operator Dua',
      roleId: '00000000-0000-4000-8000-000000000003',
      roleCode: 'OPERATOR',
      roleName: 'Operator',
      isActive: false,
      lastLoginAt: null,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
  ],
  '/shifts': () => [
    {
      id: '20000000-0000-4000-8000-000000000001',
      code: 'SHIFT-1',
      name: 'Shift 1',
      startTime: '06:00',
      endTime: '14:00',
      plannedMinutes: 480,
      description: 'Morning shift, 06:00 - 14:00.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '20000000-0000-4000-8000-000000000002',
      code: 'SHIFT-2',
      name: 'Shift 2',
      startTime: '14:00',
      endTime: '22:00',
      plannedMinutes: 480,
      description: 'Afternoon shift, 14:00 - 22:00.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '20000000-0000-4000-8000-000000000003',
      code: 'SHIFT-3',
      name: 'Shift 3',
      startTime: '22:00',
      endTime: '06:00',
      plannedMinutes: 480,
      description: 'Night shift, 22:00 - 06:00 (crosses midnight).',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
  ],
  '/items': () => [
    {
      id: '30000000-0000-4000-8000-000000000001',
      code: 'ITEM-A',
      name: 'Product A',
      category: 'Finished Goods',
      unit: 'PCS',
      standardCycleTime: 10,
      description: 'Injection molded housing, ideal cycle time 10 seconds.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '30000000-0000-4000-8000-000000000002',
      code: 'ITEM-B',
      name: 'Product B',
      category: 'Finished Goods',
      unit: 'PCS',
      standardCycleTime: 12.5,
      description: 'Injection molded bottle, ideal cycle time 12.5 seconds.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '30000000-0000-4000-8000-000000000003',
      code: 'ITEM-C',
      name: 'Product C',
      category: 'Semi Finished',
      unit: 'PCS',
      standardCycleTime: 8,
      description: 'Assembly part, ideal cycle time 8 seconds.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
  ],
  '/machines': () => [
    {
      id: '40000000-0000-4000-8000-000000000001',
      code: 'MC-001',
      name: 'Injection Molding 1',
      area: 'Line A',
      status: 'RUNNING',
      defaultCycleTime: 10,
      description: 'Primary injection molding machine, line A.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '40000000-0000-4000-8000-000000000002',
      code: 'MC-002',
      name: 'Injection Molding 2',
      area: 'Line A',
      status: 'SETUP',
      defaultCycleTime: 12.5,
      description: 'Secondary injection molding machine, line A.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '40000000-0000-4000-8000-000000000003',
      code: 'MC-003',
      name: 'Assembly Station 1',
      area: 'Line B',
      status: 'DOWN',
      defaultCycleTime: 8,
      description: 'Manual assembly station, line B.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
  ],
  '/abnormalities': () => [
    {
      id: '50000000-0000-4000-8000-000000000001',
      code: 'ABN-001',
      name: 'Machine Breakdown',
      category: 'MECHANICAL',
      isPlanned: false,
      defaultDurationMinutes: 30,
      description: 'Unexpected machine breakdown, counts as downtime loss.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '50000000-0000-4000-8000-000000000002',
      code: 'ABN-002',
      name: 'Material Problem',
      category: 'MATERIAL',
      isPlanned: false,
      defaultDurationMinutes: 15,
      description: 'Material shortage or feeding problem.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '50000000-0000-4000-8000-000000000003',
      code: 'ABN-003',
      name: 'Sensor Error',
      category: 'SENSOR',
      isPlanned: false,
      defaultDurationMinutes: 10,
      description: 'Sensor or detection error.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
  ],
  '/defects': () => [
    {
      id: '60000000-0000-4000-8000-000000000001',
      code: 'DEF-001',
      name: 'Scratch',
      defectType: 'COSMETIC',
      description: 'Surface scratch on the part.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '60000000-0000-4000-8000-000000000002',
      code: 'DEF-002',
      name: 'Crack',
      defectType: 'STRUCTURAL',
      description: 'Crack found on the part.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '60000000-0000-4000-8000-000000000003',
      code: 'DEF-003',
      name: 'Wrong Dimension',
      defectType: 'DIMENSIONAL',
      description: 'Part dimension is out of tolerance.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
  ],
  '/production-setups': () => [
    {
      id: '70000000-0000-4000-8000-000000000001',
      code: 'PS-001',
      name: 'Changeover Product A',
      itemId: '30000000-0000-4000-8000-000000000001',
      machineId: '40000000-0000-4000-8000-000000000001',
      setupMinutes: 30,
      description: 'Mould change and first article check for Product A.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '70000000-0000-4000-8000-000000000002',
      code: 'PS-002',
      name: 'Changeover Product B',
      itemId: '30000000-0000-4000-8000-000000000002',
      machineId: '40000000-0000-4000-8000-000000000002',
      setupMinutes: 25,
      description: 'Mould change and first article check for Product B.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
    {
      id: '70000000-0000-4000-8000-000000000003',
      code: 'PS-003',
      name: 'Startup Check',
      itemId: null,
      machineId: null,
      setupMinutes: 15,
      description: 'Generic startup verification, valid for any machine/item.',
      isActive: true,
      createdAt: '2026-01-02T08:00:00.000Z',
      updatedAt: '2026-01-02T08:00:00.000Z',
    },
  ],
  '/work-orders': () => {
    const month = currentMonth();
    return [
      {
        id: '80000000-0000-4000-8000-000000000001',
        code: 'WO-DAILY-DEMO',
        periodType: 'DAILY',
        periodStart: today(),
        periodEnd: today(),
        status: 'RUNNING',
        machineId: '40000000-0000-4000-8000-000000000001',
        machineCode: 'MC-001',
        itemId: '30000000-0000-4000-8000-000000000001',
        itemCode: 'ITEM-A',
        shiftId: '20000000-0000-4000-8000-000000000001',
        shiftCode: 'SHIFT-1',
        targetQty: 500,
        actualQty: 320,
        okQty: 312,
        ngQty: 8,
        plannedStart: `${today()}T06:00`,
        plannedEnd: `${today()}T14:00`,
        notes: 'Demo daily work order for the operator playground.',
        approvedByName: 'Budi Santoso',
        createdByName: 'Budi Santoso',
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-01T08:00:00.000Z',
      },
      {
        id: '80000000-0000-4000-8000-000000000002',
        code: 'WO-MONTHLY-DEMO',
        periodType: 'MONTHLY',
        periodStart: month.start,
        periodEnd: month.end,
        status: 'APPROVED',
        machineId: '40000000-0000-4000-8000-000000000002',
        machineCode: 'MC-002',
        itemId: '30000000-0000-4000-8000-000000000002',
        itemCode: 'ITEM-B',
        shiftId: '20000000-0000-4000-8000-000000000002',
        shiftCode: 'SHIFT-2',
        targetQty: 8000,
        actualQty: 5400,
        okQty: 5320,
        ngQty: 80,
        plannedStart: `${month.start}T06:00`,
        plannedEnd: `${month.end}T22:00`,
        notes: 'Demo monthly work order.',
        approvedByName: 'Budi Santoso',
        createdByName: 'Budi Santoso',
        createdAt: '2026-10-01T08:05:00.000Z',
        updatedAt: '2026-10-01T08:05:00.000Z',
      },
      {
        id: '80000000-0000-4000-8000-000000000003',
        code: 'WO-DRAFT-001',
        periodType: 'DAILY',
        periodStart: today(),
        periodEnd: today(),
        status: 'DRAFT',
        machineId: '40000000-0000-4000-8000-000000000003',
        machineCode: 'MC-003',
        itemId: '30000000-0000-4000-8000-000000000003',
        itemCode: 'ITEM-C',
        shiftId: '20000000-0000-4000-8000-000000000003',
        shiftCode: 'SHIFT-3',
        targetQty: 300,
        actualQty: 0,
        okQty: 0,
        ngQty: 0,
        plannedStart: `${today()}T22:00`,
        plannedEnd: `${today()}T06:00`,
        notes: 'Waiting for supervisor approval.',
        approvedByName: null,
        createdByName: 'Andon Admin',
        createdAt: '2026-10-02T09:00:00.000Z',
        updatedAt: '2026-10-02T09:00:00.000Z',
      },
    ];
  },
  '/production-logs': () => [
    {
      id: '90000000-0000-4000-8000-000000000001',
      eventType: 'START_SHIFT',
      result: null,
      quantity: 0,
      machineId: '40000000-0000-4000-8000-000000000001',
      machineCode: 'MC-001',
      workOrderId: '80000000-0000-4000-8000-000000000001',
      workOrderCode: 'WO-DAILY-DEMO',
      itemId: '30000000-0000-4000-8000-000000000001',
      itemCode: 'ITEM-A',
      shiftId: '20000000-0000-4000-8000-000000000001',
      userName: 'Operator Satu',
      defectId: null,
      cycleTimeSeconds: null,
      source: 'OPERATOR',
      occurredAt: `${today()}T06:02:00.000Z`,
      createdAt: `${today()}T06:02:00.000Z`,
      updatedAt: `${today()}T06:02:00.000Z`,
    },
    {
      id: '90000000-0000-4000-8000-000000000002',
      eventType: 'PRODUCE',
      result: 'OK',
      quantity: 1,
      machineId: '40000000-0000-4000-8000-000000000001',
      machineCode: 'MC-001',
      workOrderId: '80000000-0000-4000-8000-000000000001',
      workOrderCode: 'WO-DAILY-DEMO',
      itemId: '30000000-0000-4000-8000-000000000001',
      itemCode: 'ITEM-A',
      shiftId: '20000000-0000-4000-8000-000000000001',
      userName: 'Operator Satu',
      defectId: null,
      cycleTimeSeconds: 10.4,
      source: 'MQTT',
      occurredAt: `${today()}T06:15:00.000Z`,
      createdAt: `${today()}T06:15:00.000Z`,
      updatedAt: `${today()}T06:15:00.000Z`,
    },
    {
      id: '90000000-0000-4000-8000-000000000003',
      eventType: 'NG',
      result: 'NG',
      quantity: 1,
      machineId: '40000000-0000-4000-8000-000000000001',
      machineCode: 'MC-001',
      workOrderId: '80000000-0000-4000-8000-000000000001',
      workOrderCode: 'WO-DAILY-DEMO',
      itemId: '30000000-0000-4000-8000-000000000001',
      itemCode: 'ITEM-A',
      shiftId: '20000000-0000-4000-8000-000000000001',
      userName: 'Operator Satu',
      defectId: '60000000-0000-4000-8000-000000000001',
      cycleTimeSeconds: 11.2,
      source: 'OPERATOR',
      occurredAt: `${today()}T06:21:00.000Z`,
      createdAt: `${today()}T06:21:00.000Z`,
      updatedAt: `${today()}T06:21:00.000Z`,
    },
    {
      id: '90000000-0000-4000-8000-000000000004',
      eventType: 'ABNORMALITY',
      result: null,
      quantity: 0,
      machineId: '40000000-0000-4000-8000-000000000003',
      machineCode: 'MC-003',
      workOrderId: '80000000-0000-4000-8000-000000000003',
      workOrderCode: 'WO-DRAFT-001',
      itemId: '30000000-0000-4000-8000-000000000003',
      itemCode: 'ITEM-C',
      shiftId: '20000000-0000-4000-8000-000000000003',
      userName: 'Operator Dua',
      defectId: null,
      cycleTimeSeconds: null,
      source: 'OPERATOR',
      occurredAt: `${today()}T22:40:00.000Z`,
      createdAt: `${today()}T22:40:00.000Z`,
      updatedAt: `${today()}T22:40:00.000Z`,
    },
    {
      id: '90000000-0000-4000-8000-000000000005',
      eventType: 'FINISH_SHIFT',
      result: null,
      quantity: 0,
      machineId: '40000000-0000-4000-8000-000000000002',
      machineCode: 'MC-002',
      workOrderId: '80000000-0000-4000-8000-000000000002',
      workOrderCode: 'WO-MONTHLY-DEMO',
      itemId: '30000000-0000-4000-8000-000000000002',
      itemCode: 'ITEM-B',
      shiftId: '20000000-0000-4000-8000-000000000002',
      userName: 'Operator Satu',
      defectId: null,
      cycleTimeSeconds: null,
      source: 'OPERATOR',
      occurredAt: `${today()}T14:01:00.000Z`,
      createdAt: `${today()}T14:01:00.000Z`,
      updatedAt: `${today()}T14:01:00.000Z`,
    },
  ],
  '/andon-events': () => [
    {
      id: 'a0000000-0000-4000-8000-000000000001',
      machineId: '40000000-0000-4000-8000-000000000003',
      machineCode: 'MC-003',
      level: 'STOP',
      message: 'Assembly station stopped — sensor error on station 3.',
      abnormalityId: '50000000-0000-4000-8000-000000000003',
      status: 'OPEN',
      startedAt: `${today()}T22:41:00.000Z`,
      resolvedAt: null,
      createdAt: `${today()}T22:41:00.000Z`,
      updatedAt: `${today()}T22:41:00.000Z`,
    },
    {
      id: 'a0000000-0000-4000-8000-000000000002',
      machineId: '40000000-0000-4000-8000-000000000002',
      machineCode: 'MC-002',
      level: 'WARNING',
      message: 'Mould change running longer than planned (setup).',
      abnormalityId: null,
      status: 'ACKNOWLEDGED',
      startedAt: `${today()}T13:55:00.000Z`,
      resolvedAt: null,
      createdAt: `${today()}T13:55:00.000Z`,
      updatedAt: `${today()}T14:02:00.000Z`,
    },
    {
      id: 'a0000000-0000-4000-8000-000000000003',
      machineId: '40000000-0000-4000-8000-000000000001',
      machineCode: 'MC-001',
      level: 'WARNING',
      message: 'Material starvation reported by the operator.',
      abnormalityId: '50000000-0000-4000-8000-000000000002',
      status: 'RESOLVED',
      startedAt: `${today()}T07:12:00.000Z`,
      resolvedAt: `${today()}T07:27:00.000Z`,
      createdAt: `${today()}T07:12:00.000Z`,
      updatedAt: `${today()}T07:27:00.000Z`,
    },
    {
      id: 'a0000000-0000-4000-8000-000000000004',
      machineId: '40000000-0000-4000-8000-000000000001',
      machineCode: 'MC-001',
      level: 'INFO',
      message: 'Shift 1 started, machine handed over to Operator Satu.',
      abnormalityId: null,
      status: 'RESOLVED',
      startedAt: `${today()}T06:02:00.000Z`,
      resolvedAt: `${today()}T06:03:00.000Z`,
      createdAt: `${today()}T06:02:00.000Z`,
      updatedAt: `${today()}T06:03:00.000Z`,
    },
  ],
  '/kpi-snapshots': () => {
    const days = [0, 1, 2, 3, 4].map((offset) => {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      return date.toISOString().slice(0, 10);
    });

    // [availability, performance, quality, output, ng, downtime minutes]
    const profiles: Array<[number, number, number, number, number, number]> = [
      [91.5, 87.3, 98.4, 1180, 19, 42],
      [88.2, 85.6, 97.9, 1042, 22, 58],
      [93.4, 89.1, 98.8, 1256, 15, 31],
      [86.7, 82.4, 97.2, 968, 27, 67],
      [90.1, 86.9, 98.1, 1124, 21, 49],
    ];

    return days.map((date, index) => {
      const profile: [number, number, number, number, number, number] =
        profiles[index] ?? [0, 0, 0, 0, 0, 0];
      const availability = profile[0];
      const performance = profile[1];
      const quality = profile[2];
      const output = profile[3];
      const ng = profile[4];
      const downtimeMinutes = profile[5];

      return {
        id: `b0000000-0000-4000-8000-00000000000${index + 1}`,
        date,
        machineId: index % 2 === 0
          ? '40000000-0000-4000-8000-000000000001'
          : '40000000-0000-4000-8000-000000000002',
        machineCode: index % 2 === 0 ? 'MC-001' : 'MC-002',
        shiftId: index % 2 === 0
          ? '20000000-0000-4000-8000-000000000001'
          : '20000000-0000-4000-8000-000000000002',
        shiftCode: index % 2 === 0 ? 'SHIFT-1' : 'SHIFT-2',
        availability,
        performance,
        quality,
        oee: Number(((availability * performance * quality) / 10_000).toFixed(2)),
        outputQty: output,
        okQty: output - ng,
        ngQty: ng,
        downtimeMinutes,
        createdAt: `${date}T22:30:00.000Z`,
        updatedAt: `${date}T22:30:00.000Z`,
      };
    });
  },
};

function seedsFor(path: string): LocalRow[] {
  const factory = SEEDS[path];
  return factory ? clone(factory()) : [];
}
