import { describe, expect, it } from 'vitest';
import { lineMapping, remapAttempt, remapLineStats } from '../src/remap';

describe('lineMapping', () => {
  it('is the identity for unchanged text', () => {
    expect(lineMapping(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual([0, 1, 2]);
  });

  it('follows lines across insertions and deletions', () => {
    expect(lineMapping(['a', 'b', 'c', 'd'], ['a', 'x', 'b', 'd'])).toEqual([0, 2, undefined, 3]);
    expect(lineMapping(['a', 'b'], ['z', 'a', 'b'])).toEqual([1, 2]);
  });

  it('keeps lines edited in place', () => {
    expect(lineMapping(['a', 'b tpyo', 'c'], ['a', 'b typo', 'c'])).toEqual([0, 1, 2]);
    expect(lineMapping(['a', 'b', 'c'], ['A', 'b', 'C'])).toEqual([0, 1, 2]);
  });

  it('drops changed lines when the counts differ', () => {
    expect(lineMapping(['a', 'b', 'c'], ['a', 'x', 'y', 'c'])).toEqual([0, undefined, 2 + 1]);
  });

  it('handles repeated refrains', () => {
    const old = ['r', 'a', 'r', 'b', 'r'];
    const neu = ['r', 'a', 'r', 'new', 'b', 'r'];
    expect(lineMapping(old, neu)).toEqual([0, 1, 2, 4, 5]);
  });
});

describe('remap', () => {
  const map = [0, undefined, 1];
  it('moves line stats and drops removed lines', () => {
    const st = (lineIndex: number) => ({ poemId: 'p', lineIndex, missCount: lineIndex, testCount: 3 });
    expect(remapLineStats([st(0), st(1), st(2)], map)).toEqual([st(0), { ...st(2), lineIndex: 1 }]);
  });
  it('moves attempt line indices', () => {
    const a = { poemId: 'p', date: 'd', firstPassMisses: [1, 2], totalLines: 3 };
    expect(remapAttempt(a, map)).toEqual({ ...a, firstPassMisses: [1] });
    expect(remapAttempt({ ...a, lines: [0, 1, 2] }, map).lines).toEqual([0, 1]);
  });
});
