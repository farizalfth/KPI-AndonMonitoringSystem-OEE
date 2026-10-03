<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-900 px-4">
    <div class="card max-w-md p-6 text-center">
      <p class="text-3xl font-bold text-slate-300">404</p>
      <h2 class="mt-2 text-lg font-semibold text-slate-800">Page not found</h2>
      <p class="mt-2 text-sm text-slate-600">The page you requested does not exist or has been moved.</p>
      <button class="btn-primary mt-6" type="button" @click="router.push('/')">Go home</button>
    </div>
  </div>
</template>
