import { deleteFolder, exportAll, importAll, listFolders, listPoems, saveFolder } from '../db';
import { h, isTouchDevice, mount } from '../dom';
import { byName, inFolder, validChoice, type FolderChoice } from '../folders';
import { newId, type Backup, type Poem } from '../model';

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

// On a phone or tablet, shares the backup (so it can go to a cloud storage app). On a
// computer, or if sharing isn't possible, saves it as a download. Returns a note for the user.
async function exportBackup(): Promise<string | undefined> {
  const json = JSON.stringify(await exportAll(), null, 2);
  const base = `rhapsode-backup-${new Date().toISOString().slice(0, 10)}`;
  const asJson = new File([json], `${base}.json`, { type: 'application/json' });
  const asText = new File([json], `${base}.txt`, { type: 'text/plain' });
  // Chrome on Android refuses to share .json files (while canShare still says yes) but
  // shares plain text, so try .txt first there. Both import the same way.
  const candidates = /Android/i.test(navigator.userAgent) ? [asText, asJson] : [asJson, asText];
  let problem = 'share' in navigator ? 'this browser can’t share files' : 'this browser can’t share';
  for (const f of isTouchDevice() ? candidates : []) {
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
  return isTouchDevice()
    ? `Saved ${asJson.name} to Downloads, because ${problem}.`
    : `Downloaded ${asJson.name}.`;
}

export async function listScreen(root: HTMLElement) {
  const [poems, folders] = await Promise.all([listPoems(), listFolders()]);
  const folderIds = new Set(folders.map((f) => f.id));
  const folderNames = new Map(folders.map((f) => [f.id, f.name]));
  let sort: Sort = (localStorage.getItem('sort') as Sort) || 'title';
  let choice: FolderChoice = validChoice(localStorage.getItem('folder'), folderIds);
  const listEl = h('div');
  const folderBar = h('div');
  const status = h('div', { class: 'muted' });
  const count = (c: FolderChoice) => poems.filter((p) => inFolder(p, c, folderIds)).length;
  const reload = () => void listScreen(root);

  const render = () => {
    if (poems.length === 0) {
      mount(listEl, h('div', { class: 'empty' }, 'No poems yet. Tap “Add poem” to begin.'));
      return;
    }
    const shown = poems.filter((p) => inFolder(p, choice, folderIds));
    if (shown.length === 0) {
      mount(listEl, h('div', { class: 'empty' }, choice === 'unfiled' ? 'No unfiled poems.' : 'No poems in this folder yet.'));
      return;
    }
    mount(
      listEl,
      ...sortPoems(shown, sort).map((p) =>
        h(
          'a',
          { class: 'card', href: `#/poem/${p.id}` },
          h('div', { class: 'title' }, p.title),
          h(
            'div',
            { class: 'muted' },
            // in All poems, also say which folder each poem is in
            [p.author, choice === 'all' && p.folderId && folderNames.get(p.folderId)].filter(Boolean).join(' · '),
          ),
          h(
            'div',
            { class: 'muted' },
            p.lastTested
              ? `Last tested ${p.lastTested} · ${
                  p.passStreak ? `passed, ${p.passStreak} in a row` : `${p.lastFirstPassMisses} of ${p.lines.length} lines missed`
                }`
              : `Never tested · ${p.lines.length} lines`,
          ),
          sort === 'passed' &&
            h('div', { class: 'muted' }, p.lastPassed ? `Last passed ${p.lastPassed}` : 'Never passed'),
        ),
      ),
    );
  };

  // A name box with Save and Cancel, for a new folder or a rename.
  const nameEditor = (initial: string, onSave: (name: string) => Promise<void>) => {
    const input = h('input', { type: 'text', placeholder: 'Folder name', autocomplete: 'off', 'aria-label': 'Folder name' });
    input.value = initial;
    const save = async () => {
      const name = input.value.trim();
      if (!name) return;
      await onSave(name);
      reload();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void save();
      if (e.key === 'Escape') renderFolderBar();
    });
    mount(
      folderBar,
      h(
        'div',
        { class: 'row' },
        input,
        h('button', { class: 'primary', onclick: () => void save() }, 'Save'),
        h('button', { onclick: () => renderFolderBar() }, 'Cancel'),
      ),
    );
    input.focus();
  };

  const renderFolderBar = () => {
    const NEW = '__new';
    const select = h(
      'select',
      {
        'aria-label': 'Folder',
        onchange: () => {
          if (select.value !== NEW) {
            choice = select.value;
            localStorage.setItem('folder', choice);
            renderFolderBar();
            render();
            return;
          }
          nameEditor('', async (name) => {
            const folder = { id: newId(), name };
            await saveFolder(folder);
            localStorage.setItem('folder', folder.id);
          });
        },
      },
      h('option', { value: 'all', selected: choice === 'all' }, `All poems (${poems.length})`),
      ...byName(folders).map((f) => h('option', { value: f.id, selected: choice === f.id }, `${f.name} (${count(f.id)})`)),
      folders.length > 0 && h('option', { value: 'unfiled', selected: choice === 'unfiled' }, `Unfiled (${count('unfiled')})`),
      h('option', { value: NEW }, 'New folder…'),
    );
    const current = folders.find((f) => f.id === choice);
    mount(
      folderBar,
      h(
        'div',
        { class: 'row' },
        select,
        current && h('button', { onclick: () => nameEditor(current.name, (name) => saveFolder({ ...current, name })) }, 'Rename'),
        current &&
          h(
            'button',
            {
              class: 'danger',
              onclick: async () => {
                const n = count(current.id);
                const moved = n ? ` Its ${n} poem${n === 1 ? '' : 's'} will move to Unfiled.` : '';
                if (!confirm(`Delete the folder “${current.name}”?${moved}`)) return;
                await deleteFolder(current.id);
                localStorage.setItem('folder', 'all');
                reload();
              },
            },
            'Delete',
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
  renderFolderBar();
  mount(
    root,
    h('div', { class: 'row spread' }, h('h1', {}, 'Poems'), h('a', { class: 'btn primary', href: '#/add' }, 'Add poem')),
    folderBar,
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
