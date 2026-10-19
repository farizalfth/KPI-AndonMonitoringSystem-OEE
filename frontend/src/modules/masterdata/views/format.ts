import { h } from 'vue';

import BaseBadge from '@/components/ui/BaseBadge.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { lookupLocal } from '@/services/local-data';

/** Presentation helpers shared by every table-driven CRUD screen. */

export function formatDateTime(value: unknown): string {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export function formatDate(value: unknown): string {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

export function formatNumber(value: unknown, digits = 2): string {
  if (value === null || value === undefined || value === '') return '—';
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return String(value);
  return parsed.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function activeBadge(row: Record<string, unknown>) {
  return h(
    BaseBadge,
    { variant: row.isActive ? 'success' : 'neutral' },
    () => (row.isActive ? 'Active' : 'Inactive'),
  );
}

export function plannedBadge(row: Record<string, unknown>) {
  return h(
    BaseBadge,
    { variant: row.isPlanned ? 'info' : 'warning' },
    () => (row.isPlanned ? 'Planned' : 'Unplanned'),
  );
}

/** Machine status is a live cache written by the production module. */
export function statusBadge(row: Record<string, unknown>) {
  return h(StatusBadge, { status: (row.status as string | null) ?? null });
}

export function booleanBadge(row: Record<string, unknown>, key = 'isActive') {
  return h(BaseBadge, { variant: row[key] ? 'success' : 'neutral' }, () => (row[key] ? 'Yes' : 'No'));
}

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const BADGE_STYLE: Record<string, { variant: BadgeVariant; label?: string }> = {
  DRAFT: { variant: 'neutral' },
  PENDING_APPROVAL: { variant: 'info' },
  APPROVED: { variant: 'success' },
  REJECTED: { variant: 'danger' },
  RUNNING: { variant: 'info' },
  COMPLETED: { variant: 'success' },
  CANCELLED: { variant: 'neutral' },
  INFO: { variant: 'info' },
  WARNING: { variant: 'warning' },
  STOP: { variant: 'danger' },
  OPEN: { variant: 'danger' },
  ACKNOWLEDGED: { variant: 'warning' },
  RESOLVED: { variant: 'success' },
  OK: { variant: 'success' },
  NG: { variant: 'danger' },
};

/** Badge for a status/level/result column, driven by `BADGE_STYLE`. */
export function statusTextBadge(key: string) {
  return (row: Record<string, unknown>) => {
    const raw = row[key] === null || row[key] === undefined ? '' : String(row[key]);
    const style = BADGE_STYLE[raw];
    return h(BaseBadge, { variant: style?.variant ?? 'neutral' }, () => style?.label ?? (raw ? raw.replace(/_/g, ' ') : '—'));
  };
}

/**
 * Cell that resolves a foreign key (`…Id`) to a readable label from the demo
 * store, falling back to a denormalised column (e.g. `machineCode`) and
 * finally to a shortened id.
 */
export function refCell(path: string, idKey: string, labelKey = 'code', fallbackKey?: string) {
  return (row: Record<string, unknown>): string => {
    const id = row[idKey];
    const fallback = fallbackKey ? row[fallbackKey] : undefined;

    if (id !== null && id !== undefined && id !== '') {
      const target = lookupLocal(path, String(id));
      const label = target?.[labelKey];
      if (label !== null && label !== undefined && label !== '') return String(label);
    }

    if (fallback !== null && fallback !== undefined && fallback !== '') return String(fallback);
    if (id === null || id === undefined || id === '') return '—';
    return String(id).slice(0, 8);
  };
}

/** `0.87` -> `87%` style cell. */
export function percentCell(key: string) {
  return (row: Record<string, unknown>) => `${formatNumber(row[key])}%`;
}

/** Current local time formatted for a `<input type="datetime-local">`. */
export function nowInput(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** Today's date formatted for a `<input type="date">`. */
export function todayInput(): string {
  return nowInput().slice(0, 10);
}
