<script setup lang="ts">
import { PERMISSIONS, WORK_ORDER_PERIOD_TYPES, WORK_ORDER_STATUSES } from '@andon/shared';

import type { TableColumn } from '@/components/ui/table';
import CrudPage from '@/modules/masterdata/components/CrudPage.vue';
import type { CrudPageProps } from '@/modules/masterdata/types';
import {
  formatDate,
  formatNumber,
  refCell,
  statusTextBadge,
  todayInput,
} from '@/modules/masterdata/views/format';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const columns: TableColumn[] = [
  { key: 'code', label: 'Code' },
  { key: 'itemId', label: 'Item', cell: refCell('/items', 'itemId') },
  { key: 'machineId', label: 'Machine', cell: refCell('/machines', 'machineId') },
  { key: 'shiftId', label: 'Shift', cell: refCell('/shifts', 'shiftId', 'name') },
  {
    key: 'periodStart',
    label: 'Period',
    cell: (row) => `${formatDate(row.periodStart)} → ${formatDate(row.periodEnd)}`,
  },
  { key: 'targetQty', label: 'Target', align: 'right', cell: (row) => formatNumber(row.targetQty, 0) },
  { key: 'actualQty', label: 'Actual', align: 'right', cell: (row) => formatNumber(row.actualQty, 0) },
  { key: 'status', label: 'Status', cell: statusTextBadge('status') },
];

const config: CrudPageProps = {
  title: 'Work Orders',
  description:
    'Planned production orders per machine, item and shift. Runs on in-browser demo data until the work order API lands.',
  resource: 'work-orders',
  columns,
  defaultSortBy: 'code',
  canWrite: auth.hasPermission(PERMISSIONS.WORKORDER_WRITE),
  createLabel: 'New work order',
  fields: [
    { key: 'code', label: 'Code', type: 'text', required: true, createOnly: true, placeholder: 'WO-001' },
    {
      key: 'periodType',
      label: 'Period type',
      type: 'select',
      required: true,
      defaultValue: 'DAILY',
      options: WORK_ORDER_PERIOD_TYPES.map((value) => ({ value, label: value })),
      hint: 'DAILY covers one day, MONTHLY the whole calendar month.',
    },
    { key: 'periodStart', label: 'Period start', type: 'date', required: true, defaultValue: todayInput() },
    { key: 'periodEnd', label: 'Period end', type: 'date', required: true, defaultValue: todayInput() },
    {
      key: 'machineId',
      label: 'Machine',
      type: 'select',
      required: true,
      optionsSource: { path: '/machines', labelKey: 'code', valueKey: 'id' },
    },
    {
      key: 'itemId',
      label: 'Item',
      type: 'select',
      required: true,
      optionsSource: { path: '/items', labelKey: 'code', valueKey: 'id' },
    },
    {
      key: 'shiftId',
      label: 'Shift',
      type: 'select',
      required: true,
      optionsSource: { path: '/shifts', labelKey: 'name', valueKey: 'id' },
    },
    { key: 'targetQty', label: 'Target quantity', type: 'number', required: true, step: '1', min: 0, defaultValue: 0 },
    {
      key: 'actualQty',
      label: 'Actual quantity',
      type: 'number',
      step: '1',
      min: 0,
      defaultValue: 0,
      hint: 'Normally written by the operator playground.',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'DRAFT',
      options: WORK_ORDER_STATUSES.map((value) => ({ value, label: value.replace(/_/g, ' ') })),
    },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};
</script>

<template>
  <CrudPage v-bind="config" />
</template>
