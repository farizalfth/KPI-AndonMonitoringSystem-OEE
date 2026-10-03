<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ApiError } from '@/services/api-error';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const error = ref<string | null>(null);
const showPassword = ref(false);

const DEMO_ACCOUNTS = [
  { role: 'Administrator', email: 'admin@example.com' },
  { role: 'Supervisor', email: 'supervisor@example.com' },
  { role: 'Operator', email: 'operator@example.com' },
];

async function submit(): Promise<void> {
  error.value = null;

  if (!email.value || !password.value) {
    error.value = 'Enter both email and password.';
    return;
  }

  try {
    await auth.login(email.value.trim(), password.value);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard';
    await router.replace(redirect);
  } catch (caught) {
    error.value =
      caught instanceof ApiError
        ? caught.message
        : 'Sign in failed. Check your connection and try again.';
  }
}

function useDemoAccount(demoEmail: string): void {
  email.value = demoEmail;
  password.value = 'Password123!';
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10">
    <div class="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl lg:grid lg:grid-cols-2">
      <!-- Brand panel -->
      <div class="hidden bg-slate-800 p-10 text-slate-300 lg:block">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded bg-brand-600 text-lg font-bold text-white">A</span>
          <div>
            <p class="text-sm font-semibold text-white">Andon Monitoring System</p>
            <p class="text-xs">OEE &amp; production analytics</p>
          </div>
        </div>

        <ul class="mt-10 space-y-4 text-sm">
          <li class="flex gap-3">
            <span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            Live machine status on the Andon board, fed by MQTT from the shop floor.
          </li>
          <li class="flex gap-3">
            <span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
            Availability, performance and quality calculated from one auditable log.
          </li>
          <li class="flex gap-3">
            <span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            Work orders, downtime reasons and defect codes in a single source of truth.
          </li>
        </ul>
      </div>

      <!-- Form panel -->
      <div class="p-8 sm:p-10">
        <h1 class="text-xl font-semibold text-slate-800">Sign in</h1>
        <p class="mt-1 text-sm text-slate-500">Use your plant account to continue.</p>

        <form class="mt-6 space-y-4" @submit.prevent="submit">
          <div>
            <label class="field-label" for="email">Email</label>
            <input
              id="email"
              v-model="email"
              class="field-input"
              type="email"
              autocomplete="username"
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label class="field-label" for="password">Password</label>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                class="field-input pr-16"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                placeholder="••••••••"
              />
              <button
                class="absolute right-2 top-1.5 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                type="button"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>

          <button class="btn-primary w-full" type="submit" :disabled="auth.loading">
            {{ auth.loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <div class="mt-8 border-t border-slate-200 pt-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Demo accounts (Password123!)</p>
          <ul class="mt-2 space-y-1">
            <li v-for="account in DEMO_ACCOUNTS" :key="account.email">
              <button
                class="flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm text-slate-600 hover:bg-slate-50"
                type="button"
                @click="useDemoAccount(account.email)"
              >
                <span>{{ account.role }}</span>
                <span class="font-mono text-xs text-slate-400">{{ account.email }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
