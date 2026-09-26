import { deletePoem, getLineStats, getPoem } from '../db';
import { h, mount } from '../dom';
import { recentlyMissed } from '../session';

export async function detailScreen(root: HTMLElement, id: string) {
  const poem = await getPoem(id);
  if (!poem) {
    location.hash = '#/';
    return;
  }
  const allStats = await getLineStats(id);
  const stats = new Map(allStats.map((s) => [s.lineIndex, s]));
  const recent = new Set(recentlyMissed(poem, allStats));

  const lines = poem.lines.flatMap((line, i) => {
    const st = stats.get(i);
    const count = st && st.testCount > 0 ? `${st.missCount}/${st.testCount}` : '';
    return [
      poem.breakBefore[i] && h('div', { class: 'stanza-gap' }),
      h(
        'div',
        { class: recent.has(i) ? 'poem-line recent' : 'poem-line' },
        h('span', { dir: 'auto' }, line),
        h('span', { class: st && st.missCount > 0 ? 'count hot' : 'count', title: 'first-pass misses / tests' }, count),
      ),
    ];
  });

  mount(
    root,
    h(
      'div',
      { class: 'row spread' },
      h('a', { class: 'btn', href: '#/' }, '‹ Poems'),
      h('a', { class: 'btn', href: `#/edit/${id}` }, 'Edit'),
    ),
    h('h1', {}, poem.title),
    h('div', { class: 'muted' }, poem.author),
    h(
      'div',
      { class: 'muted' },
      poem.lastTested
        ? `Last tested ${poem.lastTested} · ${poem.lastFirstPassMisses} of ${poem.lines.length} lines missed on first run-through`
        : `Never tested · ${poem.lines.length} lines`,
    ),
    poem.lastTested
      ? h('div', { class: 'muted' }, poem.lastPassed ? `Last passed ${poem.lastPassed}` : 'Never passed')
      : null,
    h(
      'div',
      { class: 'row', style: 'margin:16px 0 8px' },
      h('a', { class: 'btn primary big', href: `#/practice/${id}` }, 'Practice whole poem'),
    ),
    recent.size > 0
      ? h(
          'div',
          { class: 'row', style: 'margin-bottom:16px' },
          h(
            'a',
            { class: 'btn big', href: `#/practice/${id}/missed` },
            `Practice ${recent.size} missed line${recent.size === 1 ? '' : 's'}`,
          ),
        )
      : null,
    h('h2', {}, 'Lines (misses / tests)'),
    recent.size > 0 ? h('div', { class: 'muted legend' }, 'Marked lines were missed on their last try.') : null,
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
