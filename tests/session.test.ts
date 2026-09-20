import { describe, expect, it } from 'vitest';
import type { Poem } from '../src/model';
import { answer, applyResult, createSession, cueLines, currentLine } from '../src/session';

const poem: Poem = {
  id: 'p1',
  title: 'T',
  author: 'A',
  lines: ['l0', 'l1', 'l2', 'l3'],
  breakBefore: [false, false, false, false],
  createdAt: '2026-01-01',
};

describe('session', () => {
  it('finishes after one pass when everything is correct', () => {
    let s = createSession(3);
    for (let i = 0; i < 3; i++) {
      expect(currentLine(s)).toBe(i);
      s = answer(s, true);
    }
    expect(s.phase).toBe('done');
    expect(s.firstPassMisses).toEqual([]);
  });

  it('reviews only missed lines until each is correct', () => {
    let s = createSession(4);
    s = answer(s, true); // 0
    s = answer(s, false); // 1 missed
    s = answer(s, true); // 2
    s = answer(s, false); // 3 missed
    expect(s.phase).toBe('review');
    expect(s.firstPassMisses).toEqual([1, 3]);
    expect(currentLine(s)).toBe(1);
    s = answer(s, false); // 1 missed again -> goes to back
    expect(currentLine(s)).toBe(3);
    s = answer(s, true); // 3 ok
    expect(currentLine(s)).toBe(1);
    s = answer(s, true); // 1 ok
    expect(s.phase).toBe('done');
    expect(currentLine(s)).toBeNull();
    expect(s.firstPassMisses).toEqual([1, 3]); // review doesn't change first-pass record
  });

  it('handles empty and single-line poems', () => {
    expect(createSession(0).phase).toBe('done');
    const s = answer(createSession(1), false);
    expect(s.phase).toBe('review');
    expect(answer(s, true).phase).toBe('done');
  });

  it('cues with up to two preceding lines', () => {
    expect(cueLines(poem, 0)).toEqual([]);
    expect(cueLines(poem, 1)).toEqual(['l0']);
    expect(cueLines(poem, 3)).toEqual(['l1', 'l2']);
  });
});

describe('applyResult', () => {
  it('records first-pass misses only and accumulates across sessions', () => {
    let s = createSession(4);
    s = answer(s, true);
    s = answer(s, false);
    s = answer(s, true);
    s = answer(s, true);
    s = answer(s, false); // review miss must not count
    s = answer(s, true);

    const r1 = applyResult(poem, s, [], '2026-02-01');
    expect(r1.poem.lastTested).toBe('2026-02-01');
    expect(r1.poem.lastFirstPassMisses).toBe(1);
    expect(r1.attempt.firstPassMisses).toEqual([1]);
    expect(r1.lineStats.map((x) => x.missCount)).toEqual([0, 1, 0, 0]);
    expect(r1.lineStats.every((x) => x.testCount === 1)).toBe(true);
    expect(r1.lineStats[1].lastMissed).toBe('2026-02-01');

    let s2 = createSession(4);
    for (let i = 0; i < 4; i++) s2 = answer(s2, i !== 1);
    s2 = answer(s2, true);
    const r2 = applyResult(r1.poem, s2, r1.lineStats, '2026-02-05');
    expect(r2.lineStats.map((x) => x.missCount)).toEqual([0, 2, 0, 0]);
    expect(r2.lineStats.map((x) => x.testCount)).toEqual([2, 2, 2, 2]);
    expect(r2.lineStats[0].lastMissed).toBeUndefined();
  });
});
