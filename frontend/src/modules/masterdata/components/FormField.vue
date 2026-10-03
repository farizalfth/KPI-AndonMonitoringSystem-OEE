<script setup lang="ts">
import { computed } from 'vue';

import type { FieldConfig, FieldValue } from '@/modules/masterdata/types';

const props = defineProps<{
  field: FieldConfig;
  modelValue: FieldValue;
  options: Array<{ value: string; label: string }>;
  error?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{ 'update:modelValue': [FieldValue] }>();

const value = computed<FieldValue>({
  get: () => props.modelValue ?? (props.field.type === 'checkbox' ? false : ''),
  set: (next) => emit('update:modelValue', next),
});

const inputType = computed(() => {
  switch (props.field.type) {
    case 'password':
      return 'password';
    case 'number':
      return 'number';
    case 'datetime':
      return 'datetime-local';
    default:
      return 'text';
  }
});

function onTextInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  value.value = props.field.type === 'number' && raw !== '' ? Number(raw) : raw;
}

function onSelect(event: Event): void {
  const raw = (event.target as HTMLSelectElement).value;
  value.value = raw === '' ? null : raw;
}

const span = computed(() => (props.field.colSpan === 2 || props.field.type === 'textarea' ? 'sm:col-span-2' : ''));
</script>

<template>
  <label v-if="props.field.type === 'checkbox'" class="flex items-center gap-2 sm:col-span-2">
    <input v-model="value" type="checkbox" class="h-4 w-4 rounded border-slate-300" :disabled="props.disabled" />
    <span class="text-sm text-slate-700">{{ props.field.label }}</span>
    <span v-if="props.error" class="text-xs text-red-600">{{ props.error }}</span>
  </label>

  <div v-else class="block" :class="span">
    <span class="field-label">
      {{ props.field.label }}
      <span v-if="props.field.required" class="text-red-600">*</span>
    </span>

    <select
      v-if="props.field.type === 'select'"
      class="field-input"
      :class="props.error ? 'border-red-400' : ''"
      :value="String(props.modelValue ?? '')"
      :disabled="props.disabled"
      @change="onSelect"
    >
      <option value="" disabled>{{ props.field.placeholder ?? 'Select…' }}</option>
      <option v-for="option in props.options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>

    <textarea
      v-else-if="props.field.type === 'textarea'"
      class="field-input"
      rows="3"
      :class="props.error ? 'border-red-400' : ''"
      :placeholder="props.field.placeholder"
      :disabled="props.disabled"
      :value="String(props.modelValue ?? '')"
      @input="onTextInput"
    />

    <input
      v-else
      class="field-input"
      :class="props.error ? 'border-red-400' : ''"
      :type="inputType"
      :step="props.field.step"
      :min="props.field.min"
      :max="props.field.max"
      :placeholder="props.field.placeholder"
      :disabled="props.disabled"
      :value="props.modelValue === null || props.modelValue === undefined ? '' : String(props.modelValue)"
      @input="onTextInput"
    />

    <span v-if="props.error" class="mt-1 block text-xs text-red-600">{{ props.error }}</span>
    <span v-else-if="props.field.hint" class="mt-1 block text-xs text-slate-500">{{ props.field.hint }}</span>
  </div>
</template>
