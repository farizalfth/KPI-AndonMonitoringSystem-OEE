<script setup lang="ts">
import { PERMISSIONS } from '@andon/shared';

import type { TableColumn } from '@/components/ui/table';
import CrudPage from '@/modules/masterdata/components/CrudPage.vue';
import type { CrudPageProps } from '@/modules/masterdata/types';
import { useAuthStore } from '@/stores/auth';

import { activeBadge, formatDateTime } from './format';

const auth = useAuthStore();

const columns: TableColumn[] = [
  { key: 'email', label: 'Email' },
  { key: 'fullName', label: 'Full name' },
  { key: 'roleCode', label: 'Role' },
  { key: 'isActive', label: 'Status', cell: activeBadge },
  { key: 'lastLoginAt', label: 'Last login', cell: (row) => formatDateTime(row.lastLoginAt) },
];

const config: CrudPageProps = {
  title: 'Users',
  description: 'Accounts that can sign in. Passwords are hashed with bcrypt and never returned by the API.',
  resource: 'users',
  columns,
  defaultSortBy: 'fullName',
  canWrite: auth.hasPermission(PERMISSIONS.USERS_MANAGE),
  createLabel: 'New user',
  fields: [
    { key: 'email', label: 'Email', type: 'text', required: true, placeholder: 'jane.doe@example.com' },
    { key: 'fullName', label: 'Full name', type: 'text', required: true, placeholder: 'Jane Doe' },
    {
      key: 'roleId',
      label: 'Role',
      type: 'select',
      required: true,
      colSpan: 2,
      optionsSource: { path: '/roles', labelKey: 'name', valueKey: 'id', params: { sortBy: 'name' } },
      hint: 'Permissions are derived from the role on every login.',
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      createOnly: true,
      hint: 'Minimum 8 characters. Use the edit action to reset it later.',
    },
    { key: 'isActive', label: 'Account is active', type: 'checkbox', defaultValue: true },
  ],
};
</script>

<template>
  <CrudPage v-bind="config" />
</template>
