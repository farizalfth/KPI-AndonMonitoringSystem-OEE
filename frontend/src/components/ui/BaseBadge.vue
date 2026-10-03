<script setup lang="ts">
defineProps<{ variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }>();
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    :class="{
      'bg-emerald-100 text-emerald-800': variant === 'success',
      'bg-amber-100 text-amber-800': variant === 'warning',
      'bg-red-100 text-red-800': variant === 'danger',
      'bg-brand-100 text-brand-800': variant === 'info',
      'bg-slate-100 text-slate-700': !variant || variant === 'neutral',
    }"
  >
    <slot />
  </span>
</template>
