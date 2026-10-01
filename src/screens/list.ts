import { exportAll, importAll, listPoems } from '../db';
import { h, mount } from '../dom';
import type { Backup, Poem } from '../model';

type Sort = 'title' | 'stale' | 'passed';

function sortPoems(poems: Poem[], by: Sort): Poem[] {
  const copy = [...poems];
  if (by === 'stale') {
    // never tested first, then oldest test date first
    copy.sort((a, b) => (a.lastTested ?? '').localeCompare(b.lastTested ?? '') || a.title.localeCompare(b.title));
  } else if (by === 'passed') {
    // never passed first, then oldest pass date first
    copy.sort((a, b) => (a.lastPassed ?? '').localeCompare(b.lastPassed ?? '') || a.title.localeCompare(b.title));
  } else {
    copy.sort((a, b) => a.title.localeCompare(b.title));
  }
  return copy;
}

// Shares the backup (so it can go to a cloud storage app), or saves it as a download
// if sharing isn't possible. Returns a note for the user when it had to download.
async function exportBackup(): Promise<string | undefined> {
  const json = JSON.stringify(await exportAll(), null, 2);
  const base = `rhapsode-backup-${new Date().toISOString().slice(0, 10)}`;
  const asJson = new File([json], `${base}.json`, { type: 'application/json' });
  const asText = new File([json], `${base}.txt`, { type: 'text/plain' });
  // Chrome on Android refuses to share .json files (while canShare still says yes) but
  // shares plain text, so try .txt first there. Both import the same way.
  const candidates = /Android/i.test(navigator.userAgent) ? [asText, asJson] : [asJson, asText];
  let problem = 'share' in navigator ? 'this browser can’t share files' : 'this browser can’t share';
  for (const f of candidates) {
    if (!navigator.canShare?.({ files: [f] })) continue;
    try {
      await navigator.share({ files: [f], title: f.name });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      problem = `sharing failed (${(e as Error).name}: ${(e as Error).message})`;
    }
  }
  const url = URL.createObjectURL(asJson);
  const a = h('a', { href: url, download: asJson.name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return `Saved ${asJson.name} to Downloads, because ${problem}.`;
}

export async function listScreen(root: HTMLElement) {
  const poems = await listPoems();
  let sort: Sort = (localStorage.getItem('sort') as Sort) || 'title';
  const listEl = h('div');
  const status = h('div', { class: 'muted' });

  const render = () => {
    if (poems.length === 0) {
      mount(listEl, h('div', { class: 'empty' }, 'No poems yet. Tap “Add poem” to begin.'));
      return;
    }
    mount(
      listEl,
      ...sortPoems(poems, sort).map((p) =>
        h(
          'a',
          { class: 'card', href: `#/poem/${p.id}` },
          h('div', { class: 'title' }, p.title),
          h('div', { class: 'muted' }, p.author),
          h(
            'div',
            { class: 'muted' },
            p.lastTested
              ? `Last tested ${p.lastTested} · ${p.lastFirstPassMisses} of ${p.lines.length} lines missed`
              : `Never tested · ${p.lines.length} lines`,
          ),
          sort === 'passed' &&
            h('div', { class: 'muted' }, p.lastPassed ? `Last passed ${p.lastPassed}` : 'Never passed'),
        ),
      ),
    );
  };

  const sortSelect = h(
    'select',
    {
      'aria-label': 'Sort',
      onchange: () => {
        sort = sortSelect.value as Sort;
        localStorage.setItem('sort', sort);
        render();
      },
    },
    h('option', { value: 'title', selected: sort === 'title' }, 'Sort: title'),
    h('option', { value: 'stale', selected: sort === 'stale' }, 'Sort: least recently tested'),
    h('option', { value: 'passed', selected: sort === 'passed' }, 'Sort: least recently passed'),
  );

  const fileInput = h('input', {
    type: 'file',
    accept: 'application/json,.json,text/plain,.txt',
    hidden: true,
    onchange: async () => {
      const f = fileInput.files?.[0];
      if (!f) return;
      try {
        await importAll(JSON.parse(await f.text()) as Backup);
        location.reload();
      } catch (e) {
        status.className = 'error';
        status.textContent = `Import failed: ${(e as Error).message}`;
      }
    },
  });

  render();
  mount(
    root,
    h('div', { class: 'row spread' }, h('h1', {}, 'Poems'), h('a', { class: 'btn primary', href: '#/add' }, 'Add poem')),
    sortSelect,
    listEl,
    h(
      'div',
      { class: 'row', style: 'margin-top:24px' },
      h(
        'button',
        {
          onclick: async () => {
            status.className = 'muted';
            status.textContent = (await exportBackup()) ?? '';
          },
        },
        'Export backup',
      ),
      h('button', { onclick: () => fileInput.click() }, 'Import backup'),
      fileInput,
    ),
    status,
    h('div', { class: 'muted version' }, `Rhapsode version ${__APP_VERSION__}`),
  );
}
