import { describe, expect, it } from 'vitest';
import type { Poem } from '../src/model';
import {
  allLines,
  answer,
  applyResult,
  createSession,
  cueLines,
  currentLine,
  lastPassDate,
  recentlyMissed,
} from '../src/session';

const poem: Poem = {
  id: 'p1',
  title: 'T',
  author: 'A',
  lines: ['l0', 'l1', 'l2', 'l3', 'l4', 'l5'],
  breakBefore: [false, false, false, true, false, false],
  createdAt: '2026-01-01',
};

describe('session', () => {
  it('finishes after one pass when everything is correct', () => {
    let s = createSession(allLines(3));
    for (let i = 0; i < 3; i++) {
      expect(currentLine(s)).toBe(i);
      s = answer(s, true);
    }
    expect(s.phase).toBe('done');
    expect(s.firstPassMisses).toEqual([]);
  });

  it('reviews only missed lines until each is correct', () => {
    let s = createSession(allLines(4));
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
    expect(createSession([]).phase).toBe('done');
    const s = answer(createSession([0]), false);
    expect(s.phase).toBe('review');
    expect(answer(s, true).phase).toBe('done');
  });

  it('asks only the given lines in a partial session', () => {
    let s = createSession([1, 4]);
    expect(currentLine(s)).toBe(1);
    s = answer(s, false);
    expect(currentLine(s)).toBe(4);
    s = answer(s, true);
    expect(s.phase).toBe('review');
    expect(currentLine(s)).toBe(1);
    s = answer(s, true);
    expect(s.phase).toBe('done');
    expect(s.firstPassMisses).toEqual([1]);
  });

  it('cues with up to four preceding lines', () => {
    expect(cueLines(0)).toEqual([]);
    expect(cueLines(1)).toEqual([0]);
    expect(cueLines(4)).toEqual([0, 1, 2, 3]);
    expect(cueLines(5)).toEqual([1, 2, 3, 4]);
  });
});

// Runs a first pass over `lines`, missing those in `misses`, then clears the review.
function run(lines: number[], misses: number[]) {
  let s = createSession(lines);
  for (const i of lines) s = answer(s, !misses.includes(i));
  while (s.phase === 'review') s = answer(s, true);
  return s;
}

describe('applyResult', () => {
  it('records first-pass misses only and accumulates across sessions', () => {
    let s = createSession(allLines(6));
    s = answer(s, true);
    s = answer(s, false);
    for (let i = 2; i < 6; i++) s = answer(s, true);
    s = answer(s, false); // review miss must not count
    s = answer(s, true);

    const r1 = applyResult(poem, s, [], '2026-02-01');
    expect(r1.poem.lastTested).toBe('2026-02-01');
    expect(r1.poem.lastFirstPassMisses).toBe(1);
    expect(r1.poem.lastPassed).toBeUndefined();
    expect(r1.attempt.firstPassMisses).toEqual([1]);
    expect(r1.attempt.lines).toBeUndefined();
    expect(r1.lineStats.map((x) => x.missCount)).toEqual([0, 1, 0, 0, 0, 0]);
    expect(r1.lineStats.every((x) => x.testCount === 1)).toBe(true);
    expect(r1.lineStats[1].lastMissed).toBe('2026-02-01');

    const r2 = applyResult(r1.poem, run(allLines(6), [1]), r1.lineStats, '2026-02-05');
    expect(r2.lineStats.map((x) => x.missCount)).toEqual([0, 2, 0, 0, 0, 0]);
    expect(r2.lineStats.map((x) => x.testCount)).toEqual([2, 2, 2, 2, 2, 2]);
    expect(r2.lineStats[0].lastMissed).toBeUndefined();

    const r3 = applyResult(r2.poem, run(allLines(6), []), r2.lineStats, '2026-02-09');
    expect(r3.poem.lastPassed).toBe('2026-02-09');
  });

  it('a partial session updates only its lines and not the poem record', () => {
    const r1 = applyResult(poem, run(allLines(6), [1, 4]), [], '2026-03-01');
    expect(recentlyMissed(r1.poem, r1.lineStats)).toEqual([1, 4]);

    const r2 = applyResult(r1.poem, run([1, 4], [4]), r1.lineStats, '2026-03-02');
    expect(r2.poem).toEqual(r1.poem); // last tested / passed unchanged
    expect(r2.attempt.lines).toEqual([1, 4]);
    expect(r2.lineStats.map((x) => [x.lineIndex, x.testCount, x.missCount])).toEqual([
      [1, 2, 1],
      [4, 2, 2],
    ]);
    const merged = r1.lineStats.map((x) => r2.lineStats.find((y) => y.lineIndex === x.lineIndex) ?? x);
    expect(recentlyMissed(r2.poem, merged)).toEqual([4]);

    // a partial session with no misses is not a pass
    const r3 = applyResult(r2.poem, run([4], []), merged, '2026-03-03');
    expect(r3.poem.lastPassed).toBeUndefined();
  });
});

describe('recentlyMissed', () => {
  it('falls back to the last whole-poem session for older data', () => {
    const p = { ...poem, lastTested: '2026-01-10' };
    const stats = [
      { poemId: 'p1', lineIndex: 0, missCount: 1, testCount: 2, lastMissed: '2026-01-05' },
      { poemId: 'p1', lineIndex: 2, missCount: 1, testCount: 2, lastMissed: '2026-01-10' },
      { poemId: 'p1', lineIndex: 9, missCount: 1, testCount: 2, lastMissed: '2026-01-10' }, // beyond the poem
    ];
    expect(recentlyMissed(p, stats)).toEqual([2]);
  });
});

describe('lastPassDate', () => {
  it('uses only whole-poem attempts with no misses', () => {
    const a = (date: string, misses: number[], lines?: number[]) => ({
      poemId: 'p1',
      date,
      firstPassMisses: misses,
      totalLines: 6,
      lines,
    });
    expect(lastPassDate([])).toBeUndefined();
    expect(lastPassDate([a('2026-01-01', []), a('2026-01-05', [2]), a('2026-01-09', [], [2])])).toBe('2026-01-01');
    expect(lastPassDate([a('2026-01-07', []), a('2026-01-03', [])])).toBe('2026-01-07');
  });
});
