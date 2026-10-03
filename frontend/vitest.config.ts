import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the frontend are plain TypeScript (no SFC mounting yet), so a
 * separate config keeps the vitest types away from the app build config.
 */
export default defineConfig({
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
