import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    env: {
      VITE_CONVEX_URL: 'https://example.convex.cloud',
      VITE_MAPBOX_API_KEY: 'test-mapbox-token',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@backend': path.resolve(__dirname, './convex'),
    },
  },
});
