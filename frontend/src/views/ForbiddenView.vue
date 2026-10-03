<script setup lang="ts">
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
</script>

<template>
  <section class="mx-auto max-w-lg">
    <div class="card p-6 text-center">
      <p class="text-3xl font-bold text-red-600">403</p>
      <h2 class="mt-2 text-lg font-semibold text-slate-800">Access denied</h2>
      <p class="mt-2 text-sm text-slate-600">
        Your role
        <span class="font-semibold">{{ auth.user?.roleName ?? 'unknown' }}</span>
        does not have the permission required for this page.
      </p>
      <p class="mt-4 text-xs text-slate-500">
        Required: <span class="font-mono">{{ ($route.meta.permissions ?? []).join(', ') }}</span>
      </p>
      <button class="btn-primary mt-6" type="button" @click="router.push('/dashboard')">Back to dashboard</button>
    </div>
  </section>
</template>
