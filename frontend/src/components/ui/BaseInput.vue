<script setup lang="ts">
defineProps<{ label: string; error?: string; hint?: string; required?: boolean }>();
</script>

<template>
  <label class="block">
    <span class="field-label">
      {{ label }}
      <span v-if="required" class="text-red-600">*</span>
    </span>
    <input
      class="field-input"
      :class="error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''"
      :aria-invalid="Boolean(error)"
      v-bind="$attrs"
    />
    <span v-if="error" class="mt-1 block text-xs text-red-600">{{ error }}</span>
    <span v-else-if="hint" class="mt-1 block text-xs text-slate-500">{{ hint }}</span>
  </label>
</template>
