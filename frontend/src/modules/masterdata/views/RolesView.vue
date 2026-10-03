<script setup lang="ts">
import { PERMISSIONS, ROLE_CODES } from '@andon/shared';

import type { TableColumn } from '@/components/ui/table';
import CrudPage from '@/modules/masterdata/components/CrudPage.vue';
import type { CrudPageProps } from '@/modules/masterdata/types';
import { useAuthStore } from '@/stores/auth';

import { formatDateTime } from './format';

const auth = useAuthStore();

const columns: TableColumn[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'baseRole', label: 'Base role', cell: (row) => row.baseRole ?? '—' },
  { key: 'description', label: 'Description' },
  { key: 'createdAt', label: 'Created', cell: (row) => formatDateTime(row.createdAt) },
];

const config: CrudPageProps = {
  title: 'Roles',
  description: 'Roles map to the permission matrix in @andon/shared. The code cannot be changed after creation.',
  resource: 'roles',
  columns,
  defaultSortBy: 'code',
  canWrite: auth.hasPermission(PERMISSIONS.MASTERDATA_WRITE),
  createLabel: 'New role',
  fields: [
    {
      key: 'code',
      label: 'Code',
      type: 'text',
      required: true,
      createOnly: true,
      placeholder: 'QUALITY_INSPECTOR',
      hint: 'Letters, numbers and underscore; stored uppercase.',
    },
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Quality Inspector' },
    {
      key: 'baseRole',
      label: 'Base role',
      type: 'select',
      placeholder: 'No base role (no permissions)',
      options: ROLE_CODES.map((code) => ({ value: code, label: code })),
      hint: 'Inherits the permission set of the selected base role.',
    },
    { key: 'description', label: 'Description', type: 'textarea' },
  ],
};
</script>

<template>
  <CrudPage v-bind="config" />
</template>
