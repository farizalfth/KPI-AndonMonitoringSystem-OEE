<script setup lang="ts">
import { MACHINE_STATUSES, type MachineStatus } from '@andon/shared';
import { computed } from 'vue';

const props = defineProps<{ status: MachineStatus | string | null | undefined }>();

const label = computed(() => (props.status ? props.status.replace('_', ' ') : 'unknown'));
const tone = computed(() => {
  switch (props.status) {
    case 'RUNNING':
      return 'bg-emerald-500 text-white';
    case 'IDLE':
      return 'bg-slate-500 text-white';
    case 'DOWN':
      return 'bg-red-600 text-white';
    case 'SETUP':
      return 'bg-amber-500 text-white';
    default:
      return 'bg-slate-300 text-slate-700';
  }
});
const known = computed(() => (MACHINE_STATUSES as readonly string[]).includes(String(props.status)));
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
    :class="tone"
    :title="known ? label : 'Status not set'"
  >
    <span class="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
    {{ label }}
  </span>
</template>
