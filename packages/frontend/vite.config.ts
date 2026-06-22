import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL ?? 'http://localhost:7900';

  return {
    plugins: [react()],
    css: {
      postcss: './postcss.config.cjs',
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: apiUrl, changeOrigin: true },
        '/health': { target: apiUrl, changeOrigin: true },
      },
    },
  };
});
