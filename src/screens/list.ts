import { exportAll, importAll, listPoems } from '../db';
import { h, mount } from '../dom';
import type { Backup, Poem } from '../model';

type Sort = 'title' | 'stale';

function sortPoems(poems: Poem[], by: Sort): Poem[] {
  const copy = [...poems];
  if (by === 'stale') {
    // never tested first, then oldest test date first
    copy.sort((a, b) => (a.lastTested ?? '').localeCompare(b.lastTested ?? '') || a.title.localeCompare(b.title));
  } else {
    copy.sort((a, b) => a.title.localeCompare(b.title));
  }
  return copy;
}

async function downloadBackup() {
  const json = JSON.stringify(await exportAll(), null, 2);
  const name = `poetapp-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
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
  );

  const fileInput = h('input', {
    type: 'file',
    accept: 'application/json,.json',
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
      h('button', { onclick: () => void downloadBackup() }, 'Export backup'),
      h('button', { onclick: () => fileInput.click() }, 'Import backup'),
      fileInput,
    ),
    status,
  );
}
