import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
    headers: {
      'Content-Security-Policy': "frame-ancestors 'self' https://*.connect.trimble.com",
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
