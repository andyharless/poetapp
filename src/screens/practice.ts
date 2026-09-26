import { getLineStats, getPoem, saveResult } from '../db';
import { h, mount } from '../dom';
import { today } from '../model';
import {
  allLines,
  answer,
  applyResult,
  createSession,
  cueLines,
  currentLine,
  recentlyMissed,
  type Session,
} from '../session';

// Practices the whole poem, or with `missedOnly` just the lines missed on their last try.
export async function practiceScreen(root: HTMLElement, id: string, missedOnly = false) {
  const poem = await getPoem(id);
  if (!poem) {
    location.hash = '#/';
    return;
  }

  const lines = missedOnly ? recentlyMissed(poem, await getLineStats(id)) : allLines(poem.lines.length);
  if (lines.length === 0) {
    location.hash = `#/poem/${id}`;
    return;
  }
  let session: Session = createSession(lines);
  let revealed = false;
  let saved = false;

  const finish = async () => {
    if (saved) return;
    saved = true;
    const existing = await getLineStats(id);
    const r = applyResult(poem, session, existing, today());
    await saveResult(r.poem, r.lineStats, r.attempt);
    render();
  };

  const mark = (correct: boolean) => {
    session = answer(session, correct);
    revealed = false;
    if (session.phase === 'done') void finish();
    render();
  };

  const render = () => {
    const back = h('a', { class: 'btn', href: `#/poem/${id}` }, session.phase === 'done' ? 'Done' : 'Quit');
    const asked = session.lines.length;
    const what = missedOnly ? `previously missed line${asked === 1 ? '' : 's'}` : 'lines';

    if (session.phase === 'done') {
      const missed = session.firstPassMisses;
      mount(
        root,
        h('div', { class: 'row spread' }, h('h1', {}, poem.title), back),
        h('h2', {}, saved ? 'Finished' : 'Saving…'),
        h(
          'p',
          {},
          missed.length === 0
            ? `Perfect: all ${asked} ${what} remembered on the first try.`
            : `${missed.length} of ${asked} ${what} missed on the first try:`,
        ),
        ...missed.map((i) => h('div', { class: 'poem-line', dir: 'auto' }, `${i + 1}. ${poem.lines[i]}`)),
      );
      return;
    }

    const line = currentLine(session)!;
    const reviewing = session.phase === 'review';
    const pct = reviewing
      ? 100 * (1 - session.queue.length / session.firstPassMisses.length)
      : (100 * session.pos) / asked;
    const cues = cueLines(line);

    mount(
      root,
      h('div', { class: 'row spread' }, h('div', { class: 'muted' }, poem.title), back),
      h('div', { class: 'progress' }, h('div', { style: `width:${pct}%` })),
      h(
        'div',
        { class: 'banner' },
        reviewing
          ? `Review: ${session.queue.length} line${session.queue.length === 1 ? '' : 's'} to go`
          : missedOnly
            ? `Missed line ${session.pos + 1} of ${asked} (line ${line + 1})`
            : `Line ${line + 1} of ${poem.lines.length}`,
      ),
      // the title cues the start of the poem
      cues.length === line
        ? h('div', { class: 'cue' }, `${poem.title}${poem.author ? ` — ${poem.author}` : ''}`)
        : null,
      ...cues.flatMap((c, k) => [
        k > 0 && poem.breakBefore[c] && h('div', { class: 'cue-gap' }),
        h('div', { class: 'cue', dir: 'auto' }, poem.lines[c]),
      ]),
      cues.length > 0 && poem.breakBefore[line] ? h('div', { class: 'cue-gap' }) : null,
      h('div', { class: revealed ? 'target revealed' : 'target', dir: 'auto' }, revealed ? poem.lines[line] : '?'),
      revealed
        ? h(
            'div',
            { class: 'row' },
            h('button', { class: 'bad big', onclick: () => mark(false) }, 'Missed'),
            h('button', { class: 'good big', onclick: () => mark(true) }, 'Got it'),
          )
        : h(
            'div',
            { class: 'row' },
            h(
              'button',
              {
                class: 'primary big',
                onclick: () => {
                  revealed = true;
                  render();
                },
              },
              'Reveal',
            ),
          ),
    );
  };

  render();
}
