<script setup lang="ts">

import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import NavIcon from '@/components/ui/NavIcon.vue';
import { resetLocalData } from '@/services/local-data';
import { serverOffline } from '@/services/resource';
import { useAuthStore } from '@/stores/auth';
import { navigation, visibleSections } from '@/types/navigation';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const collapsed = ref(false);
const mobileOpen = ref(false);

const sections = computed(() => visibleSections(navigation, auth.permissions));

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
  },
);

async function handleLogout(): Promise<void> {
  await auth.logout();
  await router.push({ name: 'login' });
}

function resetDemo(): void {
  resetLocalData();
  window.location.reload();
}

function reconnect(): void {
  serverOffline.value = false;
  window.location.reload();
}
</script>

<template>
  <div class="flex h-full min-h-screen bg-slate-100">
    <!-- Desktop sidebar -->
    <aside
      class="hidden shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 transition-all lg:flex"
      :class="collapsed ? 'w-16' : 'w-64'"
    >
      <div class="flex h-14 items-center gap-2 border-b border-slate-800 px-4">
        <span class="flex h-8 w-8 items-center justify-center rounded bg-brand-600 font-bold text-white">A</span>
        <span v-if="!collapsed" class="truncate text-sm font-semibold text-white">Andon &amp; OEE</span>
      </div>

      <nav class="flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Main navigation">
        <div v-for="section in sections" :key="section.label">
          <p v-if="!collapsed" class="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {{ section.label }}
          </p>
          <ul class="space-y-0.5">
            <li v-for="item in section.items" :key="item.to">
              <RouterLink
                :to="item.to"
                class="group flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-slate-800 hover:text-white"
                :class="route.path === item.to ? 'bg-brand-600 text-white hover:bg-brand-600' : ''"
                :title="item.label"
              >
                <NavIcon :name="item.icon" />
                <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
                <span
                  v-if="!collapsed && item.planned"
                  class="ml-auto rounded bg-slate-700 px-1.5 py-0.5 text-[10px] uppercase text-slate-300"
                >planned</span>
              </RouterLink>
            </li>
          </ul>
        </div>
      </nav>

      <div class="border-t border-slate-800 p-2">
        <button class="btn w-full justify-start text-slate-400 hover:bg-slate-800" type="button" @click="collapsed = !collapsed">
          <NavIcon name="settings" size="h-5 w-5" />
          <span v-if="!collapsed">Collapse</span>
        </button>
      </div>
    </aside>

    <!-- Mobile drawer -->
    <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" @click="mobileOpen = false" />

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <button class="btn-secondary px-2 py-1.5 lg:hidden" type="button" @click="mobileOpen = true">
          <span aria-hidden="true">☰</span>
          <span class="sr-only">Open navigation</span>
        </button>

        <h1 class="min-w-0 truncate text-sm font-semibold text-slate-700">
          {{ route.meta.title ?? 'Andon Monitoring System & OEE' }}
        </h1>

        <div class="ml-auto flex items-center gap-3">
          <div v-if="auth.user" class="hidden text-right sm:block">
            <p class="text-sm font-medium leading-tight text-slate-800">{{ auth.user.fullName }}</p>
            <p class="text-xs leading-tight text-slate-500">{{ auth.user.roleName }}</p>
          </div>
          <button class="btn-secondary" type="button" @click="handleLogout">
            <NavIcon name="logout" size="h-4 w-4" />
            <span class="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div
        v-if="serverOffline"
        class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-800"
        role="status"
      >
        <span class="font-semibold uppercase tracking-wide">Demo mode</span>
        <span>Backend unreachable — records live in this browser only (localStorage).</span>
        <span class="ml-auto flex items-center gap-3">
          <button class="font-semibold underline underline-offset-2 hover:text-amber-900" type="button" @click="reconnect">
            Retry connection
          </button>
          <button class="font-semibold underline underline-offset-2 hover:text-amber-900" type="button" @click="resetDemo">
            Reset demo data
          </button>
        </span>
      </div>

      <main class="min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
