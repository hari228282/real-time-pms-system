import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev server proxies /api and /socket.io to the backend so the browser sees a single origin
// (no CORS preflight in dev, and the socket upgrade works through Vite). In production Nginx
// plays this role.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
