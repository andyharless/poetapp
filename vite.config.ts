/// <reference types="node" />
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Shown at the bottom of the poem list (see CHANGELOG.md): the version in package.json and
// the date of the commit being built, in the committer's time zone, e.g. "0.6.2 · 20261001".
const version: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;
function commitDate(): string {
  try {
    return execSync('git log -1 --format=%cd --date=format:%Y%m%d').toString().trim();
  } catch {
    return new Date().toISOString().slice(0, 10).replaceAll('-', '');
  }
}
const appVersion = `${version} · ${commitDate()}`;

// base './' lets the built site work from any path (e.g. GitHub Pages /repo-name/).
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  plugins: [
    VitePWA({
      // 'prompt': a new version waits until the user taps Reload in the update banner (src/update.ts).
      registerType: 'prompt',
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
