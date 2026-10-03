<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description?: string;
    busy?: boolean;
    /** Hide the built-in footer (for custom form actions). */
    bare?: boolean;
  }>(),
  { busy: false, bare: false, description: '' },
);

const emit = defineEmits<{ close: [] }>();

const panel = ref<HTMLElement | null>(null);

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && !props.busy) emit('close');
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));

watch(
  () => props.open,
  async (open) => {
    document.body.classList.toggle('overflow-hidden', open);
    if (open) {
      await Promise.resolve();
      panel.value?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-10"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      @click.self="!busy && emit('close')"
    >
      <div ref="panel" class="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 class="text-base font-semibold text-slate-800">{{ title }}</h3>
            <p v-if="description" class="mt-0.5 text-sm text-slate-500">{{ description }}</p>
          </div>
          <button class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" type="button" :disabled="busy" @click="emit('close')">
            <span aria-hidden="true">✕</span>
            <span class="sr-only">Close</span>
          </button>
        </header>

        <div class="px-5 py-4">
          <slot />
        </div>

        <footer v-if="!bare" class="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <slot name="footer">
            <button class="btn-secondary" type="button" :disabled="busy" @click="emit('close')">Cancel</button>
            <button class="btn-primary" type="button" :disabled="busy">
              {{ busy ? 'Saving…' : 'Save' }}
            </button>
          </slot>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
