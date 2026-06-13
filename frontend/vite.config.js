import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

// `loadEnv(mode, cwd, '')` with an empty prefix loads ALL vars from .env
// (not just VITE_*), so build-time settings like the dev port can live there too.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.PORT) || 8080;

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: true,
      port,
      // In Docker on Windows, host bind-mount file events don't reach the
      // container, so enable polling (set USE_POLLING=true) for HMR to work.
      watch: env.USE_POLLING === 'true' ? { usePolling: true } : undefined,
    },
    preview: {
      host: true,
      port,
    },
  };
});
