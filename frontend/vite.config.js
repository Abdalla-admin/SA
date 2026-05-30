import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: ['sunaratinga.dijitalview.com'],
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': { target: 'http://api:3001', changeOrigin: true },
    },
  },
});
