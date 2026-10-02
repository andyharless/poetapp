import { getPoem, listFolders, savePoem, updatePoem } from '../db';
import { h, mount } from '../dom';
import { byName } from '../folders';
import { newId, today } from '../model';
import { formatText, parseText } from '../parse';
import { lineMapping } from '../remap';

// Adds a new poem, or edits an existing one when `id` is given.
export async function addScreen(root: HTMLElement, id?: string) {
  const existing = id ? await getPoem(id) : undefined;
  if (id && !existing) {
    location.hash = '#/';
    return;
  }
  const back = existing ? `#/poem/${existing.id}` : '#/';
  const folders = byName(await listFolders());
  // a new poem goes in the folder being viewed in the poem list, if any
  const folderIds = new Set(folders.map((f) => f.id));
  const viewing = localStorage.getItem('folder') ?? '';
  const initialFolder = existing ? existing.folderId ?? '' : viewing;
  const folder = h(
    'select',
    { 'aria-label': 'Folder' },
    h('option', { value: '' }, 'Unfiled'),
    ...folders.map((f) => h('option', { value: f.id, selected: f.id === initialFolder && folderIds.has(f.id) }, f.name)),
  );

  const title = h('input', { type: 'text', placeholder: 'Title', autocomplete: 'off' });
  const author = h('input', { type: 'text', placeholder: 'Author', autocomplete: 'off' });
  const text = h('textarea', {
    placeholder: 'Paste the poem here. Blank lines separate stanzas.',
    dir: 'auto',
  });
  const error = h('div', { class: 'error' });
  if (existing) {
    title.value = existing.title;
    author.value = existing.author;
    text.value = formatText(existing);
  }

  const file = h('input', {
    type: 'file',
    accept: 'text/plain,.txt',
    onchange: async () => {
      const f = file.files?.[0];
      if (!f) return;
      text.value = await f.text();
      if (!title.value) title.value = f.name.replace(/\.[^.]+$/, '');
    },
  });

  const save = async () => {
    const { lines, breakBefore } = parseText(text.value);
    if (!title.value.trim()) return void (error.textContent = 'Please enter a title.');
    if (lines.length === 0) return void (error.textContent = 'The poem text is empty.');
    const fields = {
      title: title.value.trim(),
      author: author.value.trim(),
      folderId: folder.value || undefined,
      lines,
      breakBefore,
    };
    if (existing) {
      await updatePoem({ ...existing, ...fields }, lineMapping(existing.lines, lines));
    } else {
      await savePoem({ id: newId(), ...fields, createdAt: today() });
    }
    location.hash = back;
  };

  mount(
    root,
    h(
      'div',
      { class: 'row spread' },
      h('h1', {}, existing ? 'Edit poem' : 'Add poem'),
      h('a', { class: 'btn', href: back }, 'Cancel'),
    ),
    h('label', {}, 'Title'),
    title,
    h('label', {}, 'Author'),
    author,
    folders.length > 0 && h('label', {}, 'Folder'),
    folders.length > 0 && folder,
    h('label', {}, 'Text'),
    text,
    existing
      ? h('div', { class: 'muted' }, 'Practice history stays with lines that are unchanged or edited in place.')
      : null,
    h('label', {}, existing ? 'Or replace with a .txt file' : 'Or load from a .txt file'),
    file,
    error,
    h('div', { class: 'row', style: 'margin-top:16px' }, h('button', { class: 'primary big', onclick: () => void save() }, 'Save')),
  );
}
