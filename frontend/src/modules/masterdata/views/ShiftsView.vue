<script setup lang="ts">
import { PERMISSIONS } from '@andon/shared';

import type { TableColumn } from '@/components/ui/table';
import CrudPage from '@/modules/masterdata/components/CrudPage.vue';
import type { CrudPageProps } from '@/modules/masterdata/types';
import { useAuthStore } from '@/stores/auth';

import { activeBadge, formatNumber } from './format';

const auth = useAuthStore();

const columns: TableColumn[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'startTime', label: 'Start' },
  { key: 'endTime', label: 'End' },
  { key: 'plannedMinutes', label: 'Planned (min)', align: 'right', cell: (row) => formatNumber(row.plannedMinutes, 0) },
  { key: 'isActive', label: 'Enabled', cell: activeBadge },
];

const config: CrudPageProps = {
  title: 'Shifts',
  description: 'Shift windows drive planned production time, which is the denominator of OEE availability.',
  resource: 'shifts',
  columns,
  defaultSortBy: 'code',
  canWrite: auth.hasPermission(PERMISSIONS.MASTERDATA_WRITE),
  createLabel: 'New shift',
  fields: [
    { key: 'code', label: 'Code', type: 'text', required: true, createOnly: true, placeholder: 'SHIFT-B' },
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Shift B' },
    { key: 'startTime', label: 'Start time', type: 'text', required: true, placeholder: '14:00', hint: '24-hour HH:MM.' },
    { key: 'endTime', label: 'End time', type: 'text', required: true, placeholder: '22:00', hint: '24-hour HH:MM.' },
    {
      key: 'plannedMinutes',
      label: 'Planned minutes',
      type: 'number',
      step: '1',
      min: 1,
      max: 1440,
      defaultValue: 480,
      hint: 'Net of breaks; defaults to 480.',
    },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'isActive', label: 'Shift is enabled', type: 'checkbox', defaultValue: true },
  ],
};
</script>

<template>
  <CrudPage v-bind="config" />
</template>
