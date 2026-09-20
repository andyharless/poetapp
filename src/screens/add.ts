import { savePoem } from '../db';
import { h, mount } from '../dom';
import { newId, today } from '../model';
import { parseText } from '../parse';

export function addScreen(root: HTMLElement) {
  const title = h('input', { type: 'text', placeholder: 'Title', autocomplete: 'off' });
  const author = h('input', { type: 'text', placeholder: 'Author', autocomplete: 'off' });
  const text = h('textarea', {
    placeholder: 'Paste the poem here. Blank lines separate stanzas.',
    dir: 'auto',
  });
  const error = h('div', { class: 'error' });

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
    await savePoem({
      id: newId(),
      title: title.value.trim(),
      author: author.value.trim(),
      lines,
      breakBefore,
      createdAt: today(),
    });
    location.hash = '#/';
  };

  mount(
    root,
    h('div', { class: 'row spread' }, h('h1', {}, 'Add poem'), h('a', { class: 'btn', href: '#/' }, 'Cancel')),
    h('label', {}, 'Title'),
    title,
    h('label', {}, 'Author'),
    author,
    h('label', {}, 'Text'),
    text,
    h('label', {}, 'Or load from a .txt file'),
    file,
    error,
    h('div', { class: 'row', style: 'margin-top:16px' }, h('button', { class: 'primary big', onclick: () => void save() }, 'Save')),
  );
}
