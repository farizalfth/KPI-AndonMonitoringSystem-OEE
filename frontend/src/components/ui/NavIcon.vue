<script setup lang="ts">
import { computed } from 'vue';

/** Minimal inline icon set (heroicon-style outline paths, 24x24). */
const PATHS: Record<string, string> = {
  dashboard: 'M3 12h4l3 8 4-16 3 8h4',
  users: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  shield: 'M12 4l8 4v5c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V8l8-4z',
  machine: 'M4 20h16M6 20V9l6-4 6 4v11M10 20v-5h4v5',
  box: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  clock: 'M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z',
  defect: 'M12 9v4m0 4h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  warning: 'M12 9v2m0 4h.01M5.1 19h13.8a2 2 0 001.7-3L13.7 4a2 2 0 00-3.4 0L3.4 16a2 2 0 001.7 3z',
  settings:
    'M10.3 4.3L8.7 5.9 6.6 3.8 4 6.4l2.1 2.1-1.6 1.6a2 2 0 000 2.8l6.1 6.1a2 2 0 002.8 0l1.6-1.6 2.1 2.1 2.6-2.6-2.1-2.1 1.6-1.6a2 2 0 000-2.8L13.1 4.3a2 2 0 00-2.8 0z',
  clipboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  play: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.4a2 2 0 012.8 0l3.2 3.2a2 2 0 010 2.8L13 12l-4 1 1-4 5.6-3.6z',
  monitor: 'M9 19V6l12-3v13M9 19a3 3 0 11-6 0 3 3 0 016 0zm12-3a3 3 0 11-6 0 3 3 0 016 0z',
  chart: 'M4 19V9m5 10V5m5 14v-7m5 7V8',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  plus: 'M12 5v14m-7-7h14',
  search: 'M21 21l-4.3-4.3M17 11a6 6 0 11-12 0 6 6 0 0112 0z',
};

const props = withDefaults(defineProps<{ name: string; size?: string }>(), { size: 'h-5 w-5' });

const path = computed(() => PATHS[props.name] ?? PATHS.dashboard);
</script>

<template>
  <svg
    :class="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    aria-hidden="true"
  >
    <path stroke-linecap="round" stroke-linejoin="round" :d="path" />
  </svg>
</template>