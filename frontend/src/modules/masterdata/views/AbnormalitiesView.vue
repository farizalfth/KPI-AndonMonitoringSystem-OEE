<script setup lang="ts">
import { ABNORMALITY_CATEGORIES, PERMISSIONS } from '@andon/shared';

import type { TableColumn } from '@/components/ui/table';
import CrudPage from '@/modules/masterdata/components/CrudPage.vue';
import type { CrudPageProps } from '@/modules/masterdata/types';
import { useAuthStore } from '@/stores/auth';

import { activeBadge, formatNumber, plannedBadge } from './format';

const auth = useAuthStore();

const columns: TableColumn[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'isPlanned', label: 'Planned', cell: plannedBadge },
  { key: 'defaultDurationMinutes', label: 'Default (min)', align: 'right', cell: (row) => formatNumber(row.defaultDurationMinutes, 0) },
  { key: 'isActive', label: 'Enabled', cell: activeBadge },
];

const config: CrudPageProps = {
  title: 'Abnormalities',
  description: 'Reason codes used by the operator module when reporting downtime. Unplanned entries stop the machine.',
  resource: 'abnormalities',
  columns,
  defaultSortBy: 'code',
  canWrite: auth.hasPermission(PERMISSIONS.MASTERDATA_WRITE),
  createLabel: 'New abnormality',
  fields: [
    { key: 'code', label: 'Code', type: 'text', required: true, createOnly: true, placeholder: 'ABN-MATL' },
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Material starvation' },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      required: true,
      defaultValue: 'OTHER',
      options: ABNORMALITY_CATEGORIES.map((value) => ({ value, label: value })),
    },
    { key: 'isPlanned', label: 'Planned downtime', type: 'checkbox', defaultValue: false },
    {
      key: 'defaultDurationMinutes',
      label: 'Default duration (minutes)',
      type: 'number',
      step: '1',
      min: 1,
      max: 1440,
      hint: 'Pre-filled in the operator downtime form.',
    },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'isActive', label: 'Reason is enabled', type: 'checkbox', defaultValue: true },
  ],
};
</script>

<template>
  <CrudPage v-bind="config" />
</template>
