<script setup lang="ts">
import type { PaginationMeta } from '@andon/shared';

import BasePagination from '@/components/ui/BasePagination.vue';
import type { TableColumn } from '@/components/ui/table';

const props = withDefaults(
  defineProps<{
    rows: Array<Record<string, unknown>>;
    columns: TableColumn[];
    meta: PaginationMeta | null;
    limit: number;
    loading?: boolean;
    error?: string | null;
    emptyText?: string;
    canWrite?: boolean;
    rowKey?: string;
  }>(),
  { loading: false, error: null, emptyText: 'No records found.', canWrite: false, rowKey: 'id' },
);

const emit = defineEmits<{
  'update:limit': [number];
  page: [number];
  edit: [Record<string, unknown>];
  remove: [Record<string, unknown>];
}>();
</script>

<template>
  <div class="card overflow-hidden">
    <p v-if="error" class="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {{ error }}
    </p>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th
              v-for="column in props.columns"
              :key="column.key"
              class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
              :class="{
                'text-right': column.align === 'right',
                'text-center': column.align === 'center',
              }"
              :style="column.width ? { width: column.width } : undefined"
            >
              {{ column.label }}
            </th>
            <th v-if="canWrite" class="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Actions
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 bg-white">
          <tr v-if="loading">
            <td :colspan="props.columns.length + (canWrite ? 1 : 0)" class="px-4 py-8 text-center text-sm text-slate-500">
              Loading…
            </td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td :colspan="props.columns.length + (canWrite ? 1 : 0)" class="px-4 py-8 text-center text-sm text-slate-500">
              {{ emptyText }}
            </td>
          </tr>
          <tr v-for="row in rows" v-else :key="String(row[rowKey])" class="hover:bg-slate-50">
            <td
              v-for="column in props.columns"
              :key="column.key"
              class="table-cell"
              :class="{
                'text-right': column.align === 'right',
                'text-center': column.align === 'center',
              }"
            >
              <component :is="column.cell?.(row)" v-if="column.cell" />
              <template v-else>{{ row[column.key] ?? '—' }}</template>
            </td>
            <td v-if="canWrite" class="table-cell text-right">
              <button class="btn-secondary px-2 py-1 text-xs" type="button" @click="emit('edit', row)">Edit</button>
              <button class="btn-danger ml-2 px-2 py-1 text-xs" type="button" @click="emit('remove', row)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BasePagination
      v-if="!loading && rows.length > 0"
      :meta="meta"
      :limit="limit"
      @update:limit="emit('update:limit', $event)"
      @change="emit('page', $event)"
    />
  </div>
</template>
