<script setup lang="ts">
import { useRoute } from 'vue-router';

import PageHeader from '@/components/ui/PageHeader.vue';

/**
 * Placeholder for the modules owned by the other team members.
 * The route, its permission guard and the navigation entry already exist, so
 * the module can be dropped in without touching the shell.
 */
const route = useRoute();
</script>

<template>
  <section>
    <PageHeader
      :title="String(route.meta.title ?? 'Module')"
      :description="`Planned owner: ${String(route.meta.plannedBy ?? 'unassigned')}`"
    />

    <div class="card p-6">
      <h3 class="text-sm font-semibold text-slate-700">Not implemented in this phase</h3>
      <p class="mt-2 max-w-2xl text-sm text-slate-600">
        This screen is intentionally a placeholder. The layout, the navigation entry and the permission
        guard (<span class="font-mono text-xs">{{ (route.meta.permissions ?? []).join(', ') }}</span>) are in
        place, so the feature owner only has to add the view and register it in
        <span class="font-mono text-xs">src/router/index.ts</span>.
      </p>
      <p class="mt-4 text-sm text-slate-500">
        Check <span class="font-mono text-xs">docs/collaboration.md</span> for the agreed API contract and
        the module ownership split.
      </p>
    </div>
  </section>
</template>
