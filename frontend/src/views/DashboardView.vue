<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import type { Machine } from '@andon/shared';
import { PERMISSIONS } from '@andon/shared';

import PageHeader from '@/components/ui/PageHeader.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { getList } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const machines = ref<Machine[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const canSeeMasterdata = computed(() => auth.hasPermission(PERMISSIONS.MASTERDATA_READ));

const totals = computed(() => ({
  total: machines.value.length,
  running: machines.value.filter((machine) => machine.status === 'RUNNING').length,
  down: machines.value.filter((machine) => machine.status === 'DOWN').length,
  setup: machines.value.filter((machine) => machine.status === 'SETUP').length,
  idle: machines.value.filter((machine) => machine.status === 'IDLE').length,
}));

onMounted(async () => {
  if (!canSeeMasterdata.value) {
    loading.value = false;
    return;
  }
  try {
    const { data } = await getList<Machine>('/masterdata/machines', { page: 1, limit: 100, sortBy: 'code' });
    machines.value = data;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Failed to load machines.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <PageHeader
      :title="`Welcome, ${auth.user?.fullName ?? 'operator'}`"
      :description="`Signed in as ${auth.user?.roleName ?? 'unknown role'}. Live KPIs arrive with the production module (Phase 4).`"
    />

    <div v-if="canSeeMasterdata" class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
      <div class="card p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Machines</p>
        <p class="mt-1 text-2xl font-semibold text-slate-800">{{ totals.total }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-emerald-600">Running</p>
        <p class="mt-1 text-2xl font-semibold text-slate-800">{{ totals.running }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-amber-600">Setup</p>
        <p class="mt-1 text-2xl font-semibold text-slate-800">{{ totals.setup }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Idle</p>
        <p class="mt-1 text-2xl font-semibold text-slate-800">{{ totals.idle }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-red-600">Down</p>
        <p class="mt-1 text-2xl font-semibold text-slate-800">{{ totals.down }}</p>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div class="border-b border-slate-200 px-4 py-3">
        <h3 class="text-sm font-semibold text-slate-700">Machine status</h3>
        <p class="text-xs text-slate-500">
          Status is a cache of the latest production log per machine and updates in real time in Phase 5.
        </p>
      </div>

      <p v-if="error" class="px-4 py-6 text-center text-sm text-red-600">{{ error }}</p>
      <p v-else-if="loading" class="px-4 py-6 text-center text-sm text-slate-500">Loading machines…</p>
      <p v-else-if="!canSeeMasterdata" class="px-4 py-6 text-center text-sm text-slate-500">
        Your role cannot read master data.
      </p>
      <p v-else-if="machines.length === 0" class="px-4 py-6 text-center text-sm text-slate-500">No machines configured yet.</p>
      <ul v-else class="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="machine in machines" :key="machine.id" class="rounded-lg border border-slate-200 p-3">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-800">{{ machine.name }}</p>
              <p class="font-mono text-xs text-slate-500">{{ machine.code }}</p>
            </div>
            <StatusBadge :status="machine.status" />
          </div>
          <p class="mt-2 text-xs text-slate-500">{{ machine.area ?? 'No area' }}</p>
        </li>
      </ul>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-3">
      <div class="card p-4 lg:col-span-2">
        <h3 class="text-sm font-semibold text-slate-700">Implementation status</h3>
        <ul class="mt-2 space-y-2 text-sm text-slate-600">
          <li><span class="font-medium text-emerald-700">Done</span> — authentication, RBAC and master data CRUD.</li>
          <li><span class="font-medium text-slate-700">Phase 3</span> — work orders and approvals.</li>
          <li><span class="font-medium text-slate-700">Phase 4</span> — operator forms, MQTT ingest and OEE computation.</li>
          <li><span class="font-medium text-slate-700">Phase 5</span> — Andon board over Socket.IO.</li>
          <li><span class="font-medium text-slate-700">Phase 6</span> — analytics charts and reports.</li>
        </ul>
      </div>
      <div class="card p-4">
        <h3 class="text-sm font-semibold text-slate-700">Your permissions</h3>
        <ul class="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-slate-600">
          <li v-for="permission in auth.permissions" :key="permission" class="font-mono">{{ permission }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>
