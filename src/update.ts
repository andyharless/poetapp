import { registerSW } from 'virtual:pwa-register';
import { h } from './dom';

// Registers the service worker. When a new version has downloaded, shows a banner
// instead of reloading by itself, which could interrupt a practice session.
export function setUpUpdates() {
  const updateSW = registerSW({
    onNeedRefresh() {
      if (document.querySelector('.update-banner')) return;
      document.body.append(
        h(
          'div',
          { class: 'update-banner', role: 'status' },
          h('span', {}, 'A new version of Rhapsode is ready.'),
          h('button', { class: 'primary', onclick: () => void updateSW(true) }, 'Reload'),
        ),
      );
    },
    onRegisteredSW(_url, registration) {
      // iOS can keep the app suspended for a long time, so check again whenever it comes back.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration?.update();
      });
    },
  });
}
