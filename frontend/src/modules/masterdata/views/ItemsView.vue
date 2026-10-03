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
  { key: 'category', label: 'Category' },
  { key: 'unit', label: 'Unit' },
  { key: 'standardCycleTime', label: 'Standard cycle (s)', align: 'right', cell: (row) => formatNumber(row.standardCycleTime) },
  { key: 'isActive', label: 'Enabled', cell: activeBadge },
];

const config: CrudPageProps = {
  title: 'Items',
  description: 'Finished goods and components produced on the monitored lines.',
  resource: 'items',
  columns,
  defaultSortBy: 'code',
  canWrite: auth.hasPermission(PERMISSIONS.MASTERDATA_WRITE),
  createLabel: 'New item',
  fields: [
    { key: 'code', label: 'Code', type: 'text', required: true, createOnly: true, placeholder: 'FG-1001' },
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Bottle 500ml' },
    { key: 'category', label: 'Category', type: 'text', placeholder: 'Finished Good' },
    { key: 'unit', label: 'Unit', type: 'text', required: true, defaultValue: 'PCS', placeholder: 'PCS' },
    {
      key: 'standardCycleTime',
      label: 'Standard cycle time (seconds)',
      type: 'number',
      step: '0.01',
      min: 0,
      hint: 'Used as the OEE availability/performance baseline when no setup overrides it.',
    },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'isActive', label: 'Item is enabled', type: 'checkbox', defaultValue: true },
  ],
};
</script>

<template>
  <CrudPage v-bind="config" />
</template>
