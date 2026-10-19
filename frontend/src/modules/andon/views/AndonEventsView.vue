<script setup lang="ts">
import { PERMISSIONS } from '@andon/shared';

import type { TableColumn } from '@/components/ui/table';
import CrudPage from '@/modules/masterdata/components/CrudPage.vue';
import type { CrudPageProps } from '@/modules/masterdata/types';
import {
  formatDateTime,
  nowInput,
  refCell,
  statusTextBadge,
} from '@/modules/masterdata/views/format';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const LEVELS = ['INFO', 'WARNING', 'STOP'];
const STATES = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];

const columns: TableColumn[] = [
  { key: 'startedAt', label: 'Started', cell: (row) => formatDateTime(row.startedAt) },
  { key: 'machineId', label: 'Machine', cell: refCell('/machines', 'machineId') },
  { key: 'level', label: 'Level', cell: statusTextBadge('level') },
  { key: 'message', label: 'Message' },
  {
    key: 'abnormalityId',
    label: 'Reason',
    cell: refCell('/abnormalities', 'abnormalityId', 'name'),
  },
  { key: 'status', label: 'State', cell: statusTextBadge('status') },
  { key: 'resolvedAt', label: 'Resolved', cell: (row) => formatDateTime(row.resolvedAt) },
];

const config: CrudPageProps = {
  title: 'Andon Monitoring',
  description:
    'Andon events raised by the shop floor: acknowledge and resolve them here. Data is dummy and stored in this browser until the realtime board arrives.',
  resource: 'andon-events',
  columns,
  defaultSortBy: 'startedAt',
  defaultSortOrder: 'desc',
  canWrite: auth.hasPermission(PERMISSIONS.ANDON_VIEW),
  createLabel: 'Raise event',
  fields: [
    { key: 'startedAt', label: 'Started at', type: 'datetime', required: true, defaultValue: nowInput() },
    {
      key: 'machineId',
      label: 'Machine',
      type: 'select',
      required: true,
      optionsSource: { path: '/machines', labelKey: 'code', valueKey: 'id' },
    },
    {
      key: 'level',
      label: 'Level',
      type: 'select',
      required: true,
      defaultValue: 'WARNING',
      options: LEVELS.map((value) => ({ value, label: value })),
      hint: 'STOP holds the line, WARNING asks for support, INFO is informational.',
    },
    { key: 'message', label: 'Message', type: 'text', required: true, placeholder: 'Machine stopped — mould change' },
    {
      key: 'abnormalityId',
      label: 'Abnormality reason',
      type: 'select',
      optionsSource: { path: '/abnormalities', labelKey: 'name', valueKey: 'id' },
    },
    {
      key: 'status',
      label: 'State',
      type: 'select',
      required: true,
      defaultValue: 'OPEN',
      options: STATES.map((value) => ({ value, label: value.replace(/_/g, ' ') })),
    },
    { key: 'resolvedAt', label: 'Resolved at', type: 'datetime', hint: 'Leave empty while the event is open.' },
  ],
};
</script>

<template>
  <CrudPage v-bind="config" />
</template>
