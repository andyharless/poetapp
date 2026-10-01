/// <reference types="node" />
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

// Shown at the bottom of the poem list, to tell which deploy a phone is running.
function appVersion(): string {
  const date = new Date().toISOString().slice(0, 10);
  try {
    return `${date} (${execSync('git rev-parse --short HEAD').toString().trim()})`;
  } catch {
    return date;
  }
}

// base './' lets the built site work from any path (e.g. GitHub Pages /repo-name/).
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Rhapsode',
        short_name: 'Rhapsode',
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
