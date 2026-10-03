import { h } from 'vue';

import BaseBadge from '@/components/ui/BaseBadge.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';

/** Presentation helpers shared by the masterdata tables. */

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
