<script setup lang="ts">
import { PERMISSIONS } from '@andon/shared';

import type { TableColumn } from '@/components/ui/table';
import CrudPage from '@/modules/masterdata/components/CrudPage.vue';
import type { CrudPageProps } from '@/modules/masterdata/types';
import { useAuthStore } from '@/stores/auth';

import { activeBadge, formatNumber, statusBadge } from './format';

const auth = useAuthStore();

const columns: TableColumn[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'area', label: 'Area' },
  { key: 'defaultCycleTime', label: 'Default cycle (s)', align: 'right', cell: (row) => formatNumber(row.defaultCycleTime) },
  { key: 'status', label: 'Live status', cell: statusBadge },
  { key: 'isActive', label: 'Enabled', cell: activeBadge },
];

const config: CrudPageProps = {
  title: 'Machines',
  description: 'Machines referenced by work orders and production logs. Status is written by the operator module, not here.',
  resource: 'machines',
  columns,
  defaultSortBy: 'code',
  canWrite: auth.hasPermission(PERMISSIONS.MASTERDATA_WRITE),
  createLabel: 'New machine',
  fields: [
    { key: 'code', label: 'Code', type: 'text', required: true, createOnly: true, placeholder: 'MC-004' },
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Injection Moulding 4' },
    { key: 'area', label: 'Area', type: 'text', placeholder: 'Line A' },
    {
      key: 'defaultCycleTime',
      label: 'Default cycle time (seconds)',
      type: 'number',
      step: '0.01',
      min: 0,
      hint: 'Fallback when a production setup has no ideal cycle time.',
    },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'isActive', label: 'Machine is enabled', type: 'checkbox', defaultValue: true },
  ],
};
</script>

<template>
  <CrudPage v-bind="config" />
</template>
