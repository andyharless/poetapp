import type { Attempt, LineStats, Poem } from './model';

export type Phase = 'first' | 'review' | 'done';

export interface Session {
  total: number;
  phase: Phase;
  index: number; // next line in first pass
  firstPassMisses: number[];
  queue: number[]; // review queue; front is the current line
}

export function createSession(total: number): Session {
  return {
    total,
    phase: total === 0 ? 'done' : 'first',
    index: 0,
    firstPassMisses: [],
    queue: [],
  };
}

// The line currently being asked for, or null when finished.
export function currentLine(s: Session): number | null {
  if (s.phase === 'first') return s.index;
  if (s.phase === 'review') return s.queue[0];
  return null;
}

export function answer(s: Session, correct: boolean): Session {
  if (s.phase === 'first') {
    const misses = correct ? s.firstPassMisses : [...s.firstPassMisses, s.index];
    const index = s.index + 1;
    if (index < s.total) return { ...s, index, firstPassMisses: misses };
    return misses.length === 0
      ? { ...s, index, firstPassMisses: misses, phase: 'done' }
      : { ...s, index, firstPassMisses: misses, phase: 'review', queue: [...misses] };
  }
  if (s.phase === 'review') {
    const [head, ...rest] = s.queue;
    const queue = correct ? rest : [...rest, head];
    return { ...s, queue, phase: queue.length === 0 ? 'done' : 'review' };
  }
  return s;
}

// Lines shown as the cue for `line`: up to two preceding lines.
export function cueLines(poem: Poem, line: number): string[] {
  return poem.lines.slice(Math.max(0, line - 2), line);
}

export interface SessionResult {
  poem: Poem;
  lineStats: LineStats[];
  attempt: Attempt;
}

// Only the first pass counts toward stats; review repeats don't.
export function applyResult(
  poem: Poem,
  s: Session,
  existing: LineStats[],
  date: string,
): SessionResult {
  const byIndex = new Map(existing.map((st) => [st.lineIndex, st]));
  const missed = new Set(s.firstPassMisses);
  const lineStats: LineStats[] = poem.lines.map((_, i) => {
    const prev = byIndex.get(i) ?? { poemId: poem.id, lineIndex: i, missCount: 0, testCount: 0 };
    const isMiss = missed.has(i);
    return {
      ...prev,
      testCount: prev.testCount + 1,
      missCount: prev.missCount + (isMiss ? 1 : 0),
      lastMissed: isMiss ? date : prev.lastMissed,
    };
  });
  return {
    poem: { ...poem, lastTested: date, lastFirstPassMisses: s.firstPassMisses.length },
    lineStats,
    attempt: {
      poemId: poem.id,
      date,
      firstPassMisses: s.firstPassMisses,
      totalLines: poem.lines.length,
    },
  };
}
