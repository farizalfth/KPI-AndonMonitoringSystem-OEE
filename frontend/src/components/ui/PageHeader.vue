<script setup lang="ts">
defineProps<{ title?: string; description?: string }>();
</script>

<template>
  <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h2 v-if="title" class="text-lg font-semibold text-slate-800">{{ title }}</h2>
      <p v-if="description" class="mt-0.5 text-sm text-slate-500">{{ description }}</p>
    </div>
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
