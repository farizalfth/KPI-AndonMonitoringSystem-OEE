<script setup lang="ts">
import type { PaginationMeta } from '@andon/shared';
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';

import BaseModal from '@/components/ui/BaseModal.vue';
import DataTable from '@/components/ui/DataTable.vue';
import NavIcon from '@/components/ui/NavIcon.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import FormField from '@/modules/masterdata/components/FormField.vue';
import type { CrudPageProps, FieldConfig, FieldValue, SelectSource } from '@/modules/masterdata/types';
import { ApiError } from '@/services/api';
import { masterdataPath } from '@/services/paths';
import { createRow, deleteRow, listRows, updateRow } from '@/services/resource';

/**
 * Data-driven CRUD screen shared by every Master Data page.
 *
 * A page only declares its columns, form fields and (optionally) where the
 * select options come from; listing, searching, paging, validation, saving and
 * delete confirmation are implemented once here.
 */
const props = defineProps<CrudPageProps>();

type Row = Record<string, unknown>;

const path = masterdataPath(props.resource);

const rows = shallowRef<Row[]>([]);
const meta = shallowRef<PaginationMeta | null>(null);
const page = ref(1);
const limit = ref(25);
const search = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const formOpen = ref(false);
const editing = ref<Row | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);
const fieldErrors = ref<Record<string, string>>({});
const values = ref<Record<string, FieldValue>>({});
const confirmOpen = ref(false);
const deleting = ref<Row | null>(null);
const deletingBusy = ref(false);
const options = ref<Record<string, Array<{ value: string; label: string }>>>({});

function optionKey(source: SelectSource): string {
  return `${source.path}?${JSON.stringify(source.params ?? {})}`;
}

async function loadSelectOptions(): Promise<void> {
  const pending = props.fields.filter(
    (field) => field.optionsSource && !(optionKey(field.optionsSource) in options.value),
  );

  for (const field of pending) {
    const source = field.optionsSource!;
    try {
      const { data } = await listRows<Row>(source.path, {
        page: 1,
        limit: 100,
        sortBy: 'code',
        ...source.params,
      });
      options.value = {
        ...options.value,
        [optionKey(source)]: data.map((row) => ({
          value: String(row[source.valueKey] ?? ''),
          label: String(row[source.labelKey] ?? '—'),
        })),
      };
    } catch {
      options.value = { ...options.value, [optionKey(source)]: [] };
    }
  }
}

async function fetchRows(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const result = await listRows<Row>(path, {
      page: page.value,
      limit: limit.value,
      ...(search.value ? { search: search.value } : {}),
      ...(props.defaultSortBy ? { sortBy: props.defaultSortBy } : {}),
      ...(props.defaultSortOrder ? { sortOrder: props.defaultSortOrder } : {}),
      ...props.params,
    });
    rows.value = result.data;
    meta.value = result.meta;
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Failed to load records.';
    rows.value = [];
    meta.value = null;
  } finally {
    loading.value = false;
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    void fetchRows();
  }, 300);
});

watch([page, limit], () => void fetchRows());

onMounted(() => {
  void fetchRows();
  void loadSelectOptions();
});

onBeforeUnmount(() => clearTimeout(searchTimer));

function singular(): string {
  return props.title.replace(/s$/, '');
}

function fieldVisible(field: FieldConfig): boolean {
  return editing.value ? !field.createOnly : !field.editOnly;
}

function optionsFor(field: FieldConfig): Array<{ value: string; label: string }> {
  if (field.options) return field.options;
  return field.optionsSource ? (options.value[optionKey(field.optionsSource)] ?? []) : [];
}

function resetForm(row: Row | null): void {
  editing.value = row;
  fieldErrors.value = {};
  formError.value = null;
  const next: Record<string, FieldValue> = {};
  for (const field of props.fields) {
    if (row) {
      const raw = row[field.key];
      next[field.key] = field.type === 'checkbox' ? Boolean(raw) : ((raw as FieldValue) ?? '');
    } else if (field.type === 'checkbox') {
      next[field.key] = Boolean(field.defaultValue ?? true);
    } else {
      next[field.key] = field.defaultValue ?? '';
    }
  }
  values.value = next;
}

async function openCreate(): Promise<void> {
  resetForm(null);
  await loadSelectOptions();
  formOpen.value = true;
}

async function openEdit(row: Row): Promise<void> {
  resetForm(row);
  await loadSelectOptions();
  formOpen.value = true;
}

function validate(): boolean {
  const errors: Record<string, string> = {};
  for (const field of props.fields) {
    if (!fieldVisible(field)) continue;
    const value = values.value[field.key];

    if (field.type === 'checkbox') {
      if (field.required && !value) errors[field.key] = `${field.label} must be enabled`;
      continue;
    }
    if (field.required && (value === '' || value === null || value === undefined)) {
      errors[field.key] = `${field.label} is required`;
      continue;
    }
    if (field.type === 'number' && value !== '' && value !== null && Number.isNaN(Number(value))) {
      errors[field.key] = `${field.label} must be a number`;
    }
  }
  fieldErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function buildPayload(): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of props.fields) {
    if (!fieldVisible(field)) continue;
    if (field.key === 'confirmPassword') continue;

    const value = values.value[field.key];
    if (field.type === 'checkbox') {
      payload[field.key] = Boolean(value);
    } else if (value === '' || value === null || value === undefined) {
      payload[field.key] = field.required ? value : null;
    } else if (field.type === 'number') {
      payload[field.key] = Number(value);
    } else {
      payload[field.key] = value;
    }
  }
  return payload;
}

async function save(): Promise<void> {
  if (!validate()) return;

  saving.value = true;
  formError.value = null;
  try {
    if (editing.value) await updateRow<Row>(path, String(editing.value.id), buildPayload());
    else await createRow<Row>(path, buildPayload());
    formOpen.value = false;
    await fetchRows();
  } catch (caught) {
    formError.value = caught instanceof ApiError ? caught.message : 'Failed to save the record.';
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(): Promise<void> {
  if (!deleting.value) return;
  deletingBusy.value = true;
  try {
    await deleteRow(path, String(deleting.value.id));
    confirmOpen.value = false;
    deleting.value = null;
    if (rows.value.length === 1 && page.value > 1) page.value -= 1;
    else await fetchRows();
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Failed to delete the record.';
    confirmOpen.value = false;
  } finally {
    deletingBusy.value = false;
  }
}
</script>

<template>
  <section>
    <PageHeader :title="props.title" :description="props.description">
      <template #actions>
        <div class="relative">
          <span class="pointer-events-none absolute left-2.5 top-2.5 text-slate-400">
            <NavIcon name="search" size="h-4 w-4" />
          </span>
          <input
            v-model="search"
            class="field-input w-56 pl-8"
            type="search"
            placeholder="Search…"
            aria-label="Search records"
          />
        </div>
        <button v-if="props.canWrite" class="btn-primary" type="button" @click="openCreate">
          <NavIcon name="plus" size="h-4 w-4" />
          {{ props.createLabel ?? 'New' }}
        </button>
      </template>
    </PageHeader>

    <DataTable
      :rows="rows"
      :columns="props.columns"
      :meta="meta"
      :limit="limit"
      :loading="loading"
      :error="error"
      :can-write="props.canWrite"
      empty-text="No records match the current filters."
      @update:limit="limit = $event"
      @page="page = $event"
      @edit="openEdit"
      @remove="(row: Row) => { deleting = row; confirmOpen = true; }"
    />

    <BaseModal
      :open="formOpen"
      :title="editing ? `Edit ${singular()}` : `New ${singular()}`"
      :description="editing ? 'Changes apply to every future transaction.' : 'Fields marked * are required.'"
      :busy="saving"
      @close="formOpen = false"
    >
      <template #footer>
        <button class="btn-secondary" type="button" :disabled="saving" @click="formOpen = false">Cancel</button>
        <button class="btn-primary" type="button" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </template>

      <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="save">
        <p v-if="formError" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
          {{ formError }}
        </p>

        <FormField
          v-for="field in props.fields.filter(fieldVisible)"
          :key="field.key"
          :field="field"
          :model-value="values[field.key] ?? ''"
          :options="optionsFor(field)"
          :error="fieldErrors[field.key]"
          :disabled="saving"
          @update:model-value="(value: FieldValue) => { values[field.key] = value; }"
        />
      </form>
    </BaseModal>

    <BaseModal
      :open="confirmOpen"
      title="Delete record"
      description="This action cannot be undone. Records referenced by other data are rejected by the server."
      :busy="deletingBusy"
      @close="confirmOpen = false"
    >
      <p class="text-sm text-slate-600">
        Delete
        <span class="font-semibold">{{ String(deleting?.[props.columns[0]?.key ?? 'id'] ?? '') }}</span>?
      </p>
      <template #footer>
        <button class="btn-secondary" type="button" :disabled="deletingBusy" @click="confirmOpen = false">Cancel</button>
        <button class="btn-danger" type="button" :disabled="deletingBusy" @click="confirmDelete">
          {{ deletingBusy ? 'Deleting…' : 'Delete' }}
        </button>
      </template>
    </BaseModal>
  </section>
</template>
