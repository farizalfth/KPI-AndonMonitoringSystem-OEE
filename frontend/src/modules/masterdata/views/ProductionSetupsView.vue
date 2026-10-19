<script setup lang="ts">
import { PERMISSIONS } from '@andon/shared';

import type { TableColumn } from '@/components/ui/table';
import CrudPage from '@/modules/masterdata/components/CrudPage.vue';
import type { CrudPageProps } from '@/modules/masterdata/types';
import { useAuthStore } from '@/stores/auth';

import { activeBadge, formatNumber, refCell } from './format';

const auth = useAuthStore();

const columns: TableColumn[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'itemId', label: 'Item', cell: refCell('/items', 'itemId') },
  { key: 'machineId', label: 'Machine', cell: refCell('/machines', 'machineId') },
  { key: 'setupMinutes', label: 'Setup (min)', align: 'right', cell: (row) => formatNumber(row.setupMinutes, 0) },
  { key: 'isActive', label: 'Enabled', cell: activeBadge },
];

const config: CrudPageProps = {
  title: 'Production Setups',
  description: 'Machine + item + shift combinations the operator module offers when starting a work order.',
  resource: 'production-setups',
  columns,
  defaultSortBy: 'code',
  canWrite: auth.hasPermission(PERMISSIONS.MASTERDATA_WRITE),
  createLabel: 'New setup',
  fields: [
    { key: 'code', label: 'Code', type: 'text', required: true, createOnly: true, placeholder: 'SET-1001' },
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Line 1 · Bottle 500ml' },
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
    { key: 'setupMinutes', label: 'Setup minutes', type: 'number', step: '1', min: 0, max: 1440, defaultValue: 0 },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'isActive', label: 'Setup is enabled', type: 'checkbox', defaultValue: true },
  ],
};
</script>

<template>
  <CrudPage v-bind="config" />
</template>
