import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({}),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Clerk and Vercel API requests must reach the network. Without this
        // denylist, the SPA navigation fallback can serve index.html for an
        // OAuth callback and hide the proxy response behind the app's 404 UI.
        navigateFallbackDenylist: [/^\/__clerk(?:\/|$)/, /^\/api(?:\/|$)/],
      },
      manifest: {
        name: 'court-finder',
        short_name: 'court-finder',
        description: 'court-finder - PWA Application',
        theme_color: '#0c0c0c',
      },
      pwaAssets: { disabled: false, config: true },
      devOptions: { enabled: true },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@backend': path.resolve(__dirname, './convex'),
    },
    dedupe: ['convex', 'convex/react'],
  },
  build: {
    sourcemap: true,
  },
});
