<script setup lang="ts">
import { EVENT_SOURCES, PERMISSIONS, PRODUCTION_EVENT_TYPES } from '@andon/shared';

import type { TableColumn } from '@/components/ui/table';
import CrudPage from '@/modules/masterdata/components/CrudPage.vue';
import type { CrudPageProps } from '@/modules/masterdata/types';
import {
  formatDateTime,
  formatNumber,
  nowInput,
  refCell,
  statusTextBadge,
} from '@/modules/masterdata/views/format';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const columns: TableColumn[] = [
  { key: 'occurredAt', label: 'Occurred', cell: (row) => formatDateTime(row.occurredAt) },
  { key: 'machineId', label: 'Machine', cell: refCell('/machines', 'machineId') },
  {
    key: 'workOrderId',
    label: 'Work order',
    cell: refCell('/work-orders', 'workOrderId', 'code', 'workOrderCode'),
  },
  { key: 'eventType', label: 'Event' },
  { key: 'result', label: 'Result', cell: statusTextBadge('result') },
  { key: 'quantity', label: 'Qty', align: 'right', cell: (row) => formatNumber(row.quantity, 0) },
  {
    key: 'cycleTimeSeconds',
    label: 'Cycle (s)',
    align: 'right',
    cell: (row) => formatNumber(row.cycleTimeSeconds),
  },
  { key: 'source', label: 'Source' },
];

const config: CrudPageProps = {
  title: 'Operator Playground',
  description:
    'Every operator action produces one production event (start shift, produce, NG, downtime). Dummy rows are kept in this browser until the production API lands.',
  resource: 'production-logs',
  columns,
  defaultSortBy: 'occurredAt',
  canWrite: auth.hasPermission(PERMISSIONS.PRODUCTION_EXECUTE),
  createLabel: 'Log event',
  fields: [
    { key: 'occurredAt', label: 'Occurred at', type: 'datetime', required: true, defaultValue: nowInput() },
    {
      key: 'machineId',
      label: 'Machine',
      type: 'select',
      required: true,
      optionsSource: { path: '/machines', labelKey: 'code', valueKey: 'id' },
    },
    {
      key: 'workOrderId',
      label: 'Work order',
      type: 'select',
      required: true,
      optionsSource: { path: '/work-orders', labelKey: 'code', valueKey: 'id' },
    },
    {
      key: 'eventType',
      label: 'Event type',
      type: 'select',
      required: true,
      defaultValue: 'PRODUCE',
      options: PRODUCTION_EVENT_TYPES.map((value) => ({ value, label: value.replace(/_/g, ' ') })),
    },
    {
      key: 'result',
      label: 'Shot result',
      type: 'select',
      defaultValue: 'OK',
      options: [
        { value: 'OK', label: 'OK' },
        { value: 'NG', label: 'NG' },
      ],
      hint: 'Only meaningful for PRODUCE / NG events.',
    },
    { key: 'quantity', label: 'Quantity', type: 'number', step: '1', min: 0, defaultValue: 1 },
    { key: 'cycleTimeSeconds', label: 'Cycle time (seconds)', type: 'number', step: '0.01', min: 0 },
    {
      key: 'defectId',
      label: 'Defect',
      type: 'select',
      optionsSource: { path: '/defects', labelKey: 'code', valueKey: 'id' },
      hint: 'Required in the real NG flow.',
    },
    {
      key: 'source',
      label: 'Source',
      type: 'select',
      required: true,
      defaultValue: 'OPERATOR',
      options: EVENT_SOURCES.map((value) => ({ value, label: value })),
    },
  ],
};
</script>

<template>
  <CrudPage v-bind="config" />
</template>
