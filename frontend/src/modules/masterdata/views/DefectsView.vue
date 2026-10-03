<script setup lang="ts">
import { PERMISSIONS } from '@andon/shared';

import type { TableColumn } from '@/components/ui/table';
import CrudPage from '@/modules/masterdata/components/CrudPage.vue';
import type { CrudPageProps } from '@/modules/masterdata/types';
import { useAuthStore } from '@/stores/auth';

import { activeBadge } from './format';

const auth = useAuthStore();

const columns: TableColumn[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'defectType', label: 'Defect type' },
  { key: 'description', label: 'Description' },
  { key: 'isActive', label: 'Enabled', cell: activeBadge },
];

const config: CrudPageProps = {
  title: 'Defects',
  description: 'Defect codes recorded per good unit; total defects feed the OEE quality factor.',
  resource: 'defects',
  columns,
  defaultSortBy: 'code',
  canWrite: auth.hasPermission(PERMISSIONS.MASTERDATA_WRITE),
  createLabel: 'New defect',
  fields: [
    { key: 'code', label: 'Code', type: 'text', required: true, createOnly: true, placeholder: 'DEF-SCRATCH' },
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Surface scratch' },
    { key: 'defectType', label: 'Defect type', type: 'text', placeholder: 'VISUAL' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'isActive', label: 'Defect is enabled', type: 'checkbox', defaultValue: true },
  ],
};
</script>

<template>
  <CrudPage v-bind="config" />
</template>
