import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Unit tests for the frontend use Vue Test Utils (SFCs). The Vue plugin is
 * required for mounting `.vue` components; the separate config keeps build-time
 * settings isolated.
 *
 * The plugin is typed against the workspace Vite 6 while vitest 2.x bundles
 * Vite 5, hence the narrowing cast.
 */
export default defineConfig({
  plugins: [vue() as unknown as Plugin],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
});
