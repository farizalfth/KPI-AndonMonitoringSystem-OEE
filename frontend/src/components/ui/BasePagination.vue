<script setup lang="ts">
import type { PaginationMeta } from '@andon/shared';
import { computed } from 'vue';

const props = defineProps<{ meta: PaginationMeta | null; limit: number }>();
const emit = defineEmits<{ 'update:limit': [number]; change: [number] }>();

const from = computed(() => (props.meta && props.meta.total > 0 ? (props.meta.page - 1) * props.meta.limit + 1 : 0));
const to = computed(() => (props.meta ? Math.min(props.meta.page * props.meta.limit, props.meta.total) : 0));

const pages = computed<number[]>(() => {
  if (!props.meta) return [];
  const totalPages = props.meta.totalPages;
  const current = props.meta.page;
  const window = 2;
  const start = Math.max(1, current - window);
  const end = Math.min(totalPages, current + window);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
});
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
    <p>
      Showing <span class="font-medium">{{ from }}</span>–<span class="font-medium">{{ to }}</span> of
      <span class="font-medium">{{ meta?.total ?? 0 }}</span>
    </p>

    <div class="flex items-center gap-2">
      <label class="flex items-center gap-1 text-xs text-slate-500">
        Rows
        <select
          class="rounded-md border border-slate-300 px-1.5 py-1 text-xs"
          :value="limit"
          @change="emit('update:limit', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="size in [10, 25, 50, 100]" :key="size" :value="size">{{ size }}</option>
        </select>
      </label>

      <div class="flex items-center gap-1">
        <button
          class="btn-secondary px-2 py-1"
          type="button"
          :disabled="!meta || meta.page <= 1"
          @click="emit('change', (meta?.page ?? 1) - 1)"
        >
          Prev
        </button>
        <button
          v-for="page in pages"
          :key="page"
          class="rounded-md px-2.5 py-1 text-sm"
          :class="page === meta?.page ? 'bg-brand-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'"
          type="button"
          @click="emit('change', page)"
        >
          {{ page }}
        </button>
        <button
          class="btn-secondary px-2 py-1"
          type="button"
          :disabled="!meta || meta.page >= meta.totalPages"
          @click="emit('change', (meta?.page ?? 1) + 1)"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
