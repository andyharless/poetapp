import { getLineStats, getPoem, saveResult } from '../db';
import { h, mount } from '../dom';
import { today } from '../model';
import { answer, applyResult, createSession, cueLines, currentLine, type Session } from '../session';

export async function practiceScreen(root: HTMLElement, id: string) {
  const poem = await getPoem(id);
  if (!poem) {
    location.hash = '#/';
    return;
  }

  let session: Session = createSession(poem.lines.length);
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
            ? `Perfect: all ${poem.lines.length} lines remembered on the first run-through.`
            : `${missed.length} of ${poem.lines.length} lines missed on the first run-through:`,
        ),
        ...missed.map((i) => h('div', { class: 'poem-line', dir: 'auto' }, `${i + 1}. ${poem.lines[i]}`)),
      );
      return;
    }

    const line = currentLine(session)!;
    const reviewing = session.phase === 'review';
    const pct = reviewing
      ? 100 * (1 - session.queue.length / session.firstPassMisses.length)
      : (100 * line) / poem.lines.length;
    const cues = cueLines(poem, line);

    mount(
      root,
      h('div', { class: 'row spread' }, h('div', { class: 'muted' }, poem.title), back),
      h('div', { class: 'progress' }, h('div', { style: `width:${pct}%` })),
      h(
        'div',
        { class: 'banner' },
        reviewing
          ? `Review: ${session.queue.length} line${session.queue.length === 1 ? '' : 's'} to go`
          : `Line ${line + 1} of ${poem.lines.length}`,
      ),
      cues.length === 0
        ? h('div', { class: 'cue' }, `${poem.title}${poem.author ? ` — ${poem.author}` : ''}`)
        : null,
      ...cues.map((c) => h('div', { class: 'cue', dir: 'auto' }, c)),
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
