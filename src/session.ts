import type { Attempt, LineStats, Poem } from './model';

export type Phase = 'first' | 'review' | 'done';

// How many preceding lines are shown as the cue for the next one.
export const CUE_LINES = 4;

export interface Session {
  lines: number[]; // line indices asked in the first pass, in order
  phase: Phase;
  pos: number; // position in `lines` during the first pass
  firstPassMisses: number[];
  queue: number[]; // review queue; front is the current line
}

export function allLines(total: number): number[] {
  return Array.from({ length: total }, (_, i) => i);
}

export function createSession(lines: number[]): Session {
  return {
    lines,
    phase: lines.length === 0 ? 'done' : 'first',
    pos: 0,
    firstPassMisses: [],
    queue: [],
  };
}

// The line currently being asked for, or null when finished.
export function currentLine(s: Session): number | null {
  if (s.phase === 'first') return s.lines[s.pos];
  if (s.phase === 'review') return s.queue[0];
  return null;
}

export function answer(s: Session, correct: boolean): Session {
  if (s.phase === 'first') {
    const misses = correct ? s.firstPassMisses : [...s.firstPassMisses, s.lines[s.pos]];
    const pos = s.pos + 1;
    if (pos < s.lines.length) return { ...s, pos, firstPassMisses: misses };
    return misses.length === 0
      ? { ...s, pos, firstPassMisses: misses, phase: 'done' }
      : { ...s, pos, firstPassMisses: misses, phase: 'review', queue: [...misses] };
  }
  if (s.phase === 'review') {
    const [head, ...rest] = s.queue;
    const queue = correct ? rest : [...rest, head];
    return { ...s, queue, phase: queue.length === 0 ? 'done' : 'review' };
  }
  return s;
}

// Indices of the lines shown as the cue for `line`: up to CUE_LINES preceding lines.
export function cueLines(line: number): number[] {
  return allLines(line).slice(-CUE_LINES);
}

// Lines whose most recent first try was a miss.
export function recentlyMissed(poem: Poem, stats: LineStats[]): number[] {
  return stats
    .filter((st) =>
      st.lastOutcome
        ? st.lastOutcome === 'miss'
        : // data from before lastOutcome existed: missed in the last whole-poem session
          !!st.lastMissed && st.lastMissed === poem.lastTested,
    )
    .map((st) => st.lineIndex)
    .filter((i) => i < poem.lines.length)
    .sort((a, b) => a - b);
}

// Date of the last whole-poem attempt with no first-pass misses.
export function lastPassDate(attempts: Attempt[]): string | undefined {
  let best: string | undefined;
  for (const a of attempts) {
    if (!a.lines && a.firstPassMisses.length === 0 && (!best || a.date > best)) best = a.date;
  }
  return best;
}

export interface SessionResult {
  poem: Poem;
  lineStats: LineStats[]; // only the lines that were asked
  attempt: Attempt;
}

// Only the first pass counts toward stats; review repeats don't. The poem's
// last-tested / last-passed record changes only for whole-poem sessions.
export function applyResult(
  poem: Poem,
  s: Session,
  existing: LineStats[],
  date: string,
): SessionResult {
  const whole = s.lines.length === poem.lines.length;
  const byIndex = new Map(existing.map((st) => [st.lineIndex, st]));
  const missed = new Set(s.firstPassMisses);
  const lineStats: LineStats[] = s.lines.map((i) => {
    const prev = byIndex.get(i) ?? { poemId: poem.id, lineIndex: i, missCount: 0, testCount: 0 };
    const isMiss = missed.has(i);
    return {
      ...prev,
      testCount: prev.testCount + 1,
      missCount: prev.missCount + (isMiss ? 1 : 0),
      lastMissed: isMiss ? date : prev.lastMissed,
      lastOutcome: isMiss ? 'miss' : 'hit',
    };
  });
  const attempt: Attempt = {
    poemId: poem.id,
    date,
    firstPassMisses: s.firstPassMisses,
    totalLines: poem.lines.length,
  };
  if (!whole) attempt.lines = s.lines;
  return {
    poem: whole
      ? {
          ...poem,
          lastTested: date,
          lastFirstPassMisses: s.firstPassMisses.length,
          lastPassed: s.firstPassMisses.length === 0 ? date : poem.lastPassed,
        }
      : poem,
    lineStats,
    attempt,
  };
}
