<script setup lang="ts">
import { PERMISSIONS } from '@andon/shared';

import type { TableColumn } from '@/components/ui/table';
import CrudPage from '@/modules/masterdata/components/CrudPage.vue';
import type { CrudPageProps } from '@/modules/masterdata/types';
import {
  formatDate,
  formatNumber,
  percentCell,
  refCell,
  todayInput,
} from '@/modules/masterdata/views/format';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const columns: TableColumn[] = [
  { key: 'date', label: 'Date', cell: (row) => formatDate(row.date) },
  { key: 'machineId', label: 'Machine', cell: refCell('/machines', 'machineId') },
  { key: 'shiftId', label: 'Shift', cell: refCell('/shifts', 'shiftId', 'name', 'shiftCode') },
  { key: 'availability', label: 'Availability', align: 'right', cell: percentCell('availability') },
  { key: 'performance', label: 'Performance', align: 'right', cell: percentCell('performance') },
  { key: 'quality', label: 'Quality', align: 'right', cell: percentCell('quality') },
  { key: 'oee', label: 'OEE', align: 'right', cell: percentCell('oee') },
  { key: 'outputQty', label: 'Output', align: 'right', cell: (row) => formatNumber(row.outputQty, 0) },
  { key: 'ngQty', label: 'NG', align: 'right', cell: (row) => formatNumber(row.ngQty, 0) },
];

const config: CrudPageProps = {
  title: 'Production Analytics',
  description:
    'Daily KPI snapshots (availability × performance × quality = OEE). The rows are dummy data kept in this browser until the analytics API lands.',
  resource: 'kpi-snapshots',
  columns,
  defaultSortBy: 'date',
  defaultSortOrder: 'desc',
  canWrite: auth.hasPermission(PERMISSIONS.ANALYTICS_VIEW),
  createLabel: 'New snapshot',
  fields: [
    { key: 'date', label: 'Date', type: 'date', required: true, defaultValue: todayInput() },
    {
      key: 'machineId',
      label: 'Machine',
      type: 'select',
      required: true,
      optionsSource: { path: '/machines', labelKey: 'code', valueKey: 'id' },
    },
    {
      key: 'shiftId',
      label: 'Shift',
      type: 'select',
      optionsSource: { path: '/shifts', labelKey: 'name', valueKey: 'id' },
    },
    {
      key: 'availability',
      label: 'Availability (%)',
      type: 'number',
      required: true,
      step: '0.1',
      min: 0,
      max: 100,
      defaultValue: 0,
    },
    {
      key: 'performance',
      label: 'Performance (%)',
      type: 'number',
      required: true,
      step: '0.1',
      min: 0,
      max: 100,
      defaultValue: 0,
    },
    {
      key: 'quality',
      label: 'Quality (%)',
      type: 'number',
      required: true,
      step: '0.1',
      min: 0,
      max: 100,
      defaultValue: 0,
    },
    {
      key: 'oee',
      label: 'OEE (%)',
      type: 'number',
      step: '0.1',
      min: 0,
      max: 100,
      defaultValue: 0,
      hint: 'Availability × Performance × Quality ÷ 10 000.',
    },
    { key: 'outputQty', label: 'Total output', type: 'number', step: '1', min: 0, defaultValue: 0 },
    { key: 'ngQty', label: 'NG quantity', type: 'number', step: '1', min: 0, defaultValue: 0 },
    {
      key: 'downtimeMinutes',
      label: 'Downtime (minutes)',
      type: 'number',
      step: '1',
      min: 0,
      defaultValue: 0,
    },
  ],
};
</script>

<template>
  <CrudPage v-bind="config" />
</template>
