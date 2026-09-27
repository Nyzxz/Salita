import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(dirname, '../shared/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Forwards API calls to the Express server during development so the
      // client can call same-origin paths like fetch('/api/words').
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
