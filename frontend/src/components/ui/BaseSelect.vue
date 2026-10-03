<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    options: Array<{ value: string | number; label: string; disabled?: boolean }>;
    placeholder?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    disabled?: boolean;
  }>(),
  { placeholder: 'Select…', error: '', hint: '' },
);
</script>

<template>
  <label class="block">
    <span class="field-label">
      {{ label }}
      <span v-if="required" class="text-red-600">*</span>
    </span>
    <select
      class="field-input"
      :class="error ? 'border-red-400' : ''"
      :disabled="disabled"
      v-bind="$attrs"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>
    <span v-if="error" class="mt-1 block text-xs text-red-600">{{ error }}</span>
    <span v-else-if="hint" class="mt-1 block text-xs text-slate-500">{{ hint }}</span>
  </label>
</template>
