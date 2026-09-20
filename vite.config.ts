import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// base './' lets the built site work from any path (e.g. GitHub Pages /repo-name/).
export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Poet',
        short_name: 'Poet',
        description: 'Memorize poetry line by line',
        display: 'standalone',
        start_url: './',
        scope: './',
        background_color: '#faf7f2',
        theme_color: '#faf7f2',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { include: ['tests/**/*.test.ts'] },
});
