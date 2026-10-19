import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

/**
 * Vite configuration.
 *
 * Note on npm workspaces: `@andon/shared` is installed in `node_modules` at the
 * repository root, so no extra alias is needed. When deploying to Vercel set the
 * project root to the repository root (see vercel.json).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:4000';

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // Fail loudly instead of silently moving to 5174: a frontend on a
      // different port than the one the team has bookmarked causes confusing
      // "login does not work" reports.
      strictPort: true,
      // Dev proxy: the frontend can call `/api/...` without CORS in development.
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: apiTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router', 'pinia', 'axios'],
            charts: ['chart.js', 'vue-chartjs'],
          },
        },
      },
    },
  };
});