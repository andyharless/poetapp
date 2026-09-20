import { deletePoem, getLineStats, getPoem } from '../db';
import { h, mount } from '../dom';

export async function detailScreen(root: HTMLElement, id: string) {
  const poem = await getPoem(id);
  if (!poem) {
    location.hash = '#/';
    return;
  }
  const stats = new Map((await getLineStats(id)).map((s) => [s.lineIndex, s]));

  const lines = poem.lines.flatMap((line, i) => {
    const st = stats.get(i);
    const count = st && st.testCount > 0 ? `${st.missCount}/${st.testCount}` : '';
    return [
      poem.breakBefore[i] && h('div', { class: 'stanza-gap' }),
      h(
        'div',
        { class: 'poem-line' },
        h('span', { dir: 'auto' }, line),
        h('span', { class: st && st.missCount > 0 ? 'count hot' : 'count', title: 'first-pass misses / tests' }, count),
      ),
    ];
  });

  mount(
    root,
    h('div', { class: 'row spread' }, h('a', { class: 'btn', href: '#/' }, '‹ Poems')),
    h('h1', {}, poem.title),
    h('div', { class: 'muted' }, poem.author),
    h(
      'div',
      { class: 'muted' },
      poem.lastTested
        ? `Last tested ${poem.lastTested} · ${poem.lastFirstPassMisses} of ${poem.lines.length} lines missed on first run-through`
        : `Never tested · ${poem.lines.length} lines`,
    ),
    h('div', { class: 'row', style: 'margin:16px 0' }, h('a', { class: 'btn primary big', href: `#/practice/${id}` }, 'Practice')),
    h('h2', {}, 'Lines (misses / tests)'),
    ...lines,
    h(
      'div',
      { style: 'margin-top:32px' },
      h(
        'button',
        {
          class: 'danger',
          onclick: async () => {
            if (confirm(`Delete “${poem.title}” and its history?`)) {
              await deletePoem(id);
              location.hash = '#/';
            }
          },
        },
        'Delete poem',
      ),
    ),
  );
}
