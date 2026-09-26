import type { Attempt, LineStats } from './model';

// For each old line index, the new index of the same line after an edit, or
// undefined if the line was removed. Unchanged lines are matched by a longest
// common subsequence. Between two matched lines, if the same number of lines
// was removed as added, they are treated as edited in place (e.g. a typo fix)
// and keep their history.
export function lineMapping(oldLines: string[], newLines: string[]): (number | undefined)[] {
  const map: (number | undefined)[] = new Array(oldLines.length).fill(undefined);

  // Common prefix and suffix first, so the quadratic LCS only sees the changed middle.
  let pre = 0;
  while (pre < oldLines.length && pre < newLines.length && oldLines[pre] === newLines[pre]) {
    map[pre] = pre;
    pre++;
  }
  let suf = 0;
  while (
    suf < oldLines.length - pre &&
    suf < newLines.length - pre &&
    oldLines[oldLines.length - 1 - suf] === newLines[newLines.length - 1 - suf]
  ) {
    map[oldLines.length - 1 - suf] = newLines.length - 1 - suf;
    suf++;
  }

  const a = oldLines.slice(pre, oldLines.length - suf);
  const b = newLines.slice(pre, newLines.length - suf);
  // lcs[i][j] = LCS length of a[i..] and b[j..]
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const pairGap = (i0: number, i1: number, j0: number, j1: number) => {
    if (i1 - i0 === j1 - j0) for (let k = 0; k < i1 - i0; k++) map[pre + i0 + k] = pre + j0 + k;
  };
  let i = 0;
  let j = 0;
  let gi = 0;
  let gj = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pairGap(gi, i, gj, j);
      map[pre + i] = pre + j;
      gi = ++i;
      gj = ++j;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  pairGap(gi, a.length, gj, b.length);
  return map;
}

export function remapLineStats(stats: LineStats[], map: (number | undefined)[]): LineStats[] {
  return stats.flatMap((st) => {
    const to = map[st.lineIndex];
    return to === undefined ? [] : [{ ...st, lineIndex: to }];
  });
}

export function remapAttempt(a: Attempt, map: (number | undefined)[]): Attempt {
  const re = (xs: number[]) => xs.flatMap((i) => (map[i] === undefined ? [] : [map[i]!]));
  return a.lines
    ? { ...a, firstPassMisses: re(a.firstPassMisses), lines: re(a.lines) }
    : { ...a, firstPassMisses: re(a.firstPassMisses) };
}
