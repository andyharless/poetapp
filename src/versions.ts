import type { ParsedText } from './parse';

// A versions file holds several versions of one poem, with their sources and an AI's guidance on choosing
// between them. docs/versions-format.md describes it; tools/versions-check.ts checks it. The app will open
// these files to compare versions and add the chosen one (see docs/ai-poem-management.md).

export type FlagKind = 'likely-error' | 'revision' | 'editorial' | 'uncertain';
export const FLAG_KINDS: readonly FlagKind[] = ['likely-error', 'revision', 'editorial', 'uncertain'];

export interface PoemVersion {
  id: string;
  source: string; // where it came from: an edition or site, or the name of a file the owner supplied
  url?: string;
  published?: string; // when this text was published, as precise as known: "1816", "1912 (ed. E. H. Coleridge)"
  retrieved?: string; // yyyy-mm-dd
  text: string; // plain text, blank lines between stanzas, as pasted into the app
  notes?: string;
  detail?: string;
}

export interface VersionFlag {
  version: string; // a PoemVersion id
  line: number; // counts that version's non-blank lines, from 1
  quote: string; // the words in that line the flag is about
  kind: FlagKind;
  suggest?: string;
  note: string;
  detail?: string;
}

export interface VersionsFile {
  format: 'rhapsode-versions';
  version: 1;
  title: string;
  author: string;
  folder?: string;
  recommendation?: { base: string; summary: string; detail?: string };
  versions: PoemVersion[];
  flags?: VersionFlag[];
  sections?: { startLine: number; label?: string }[]; // reserved for sections of long poems
}

// A place where two versions differ: lines [baseStart, baseEnd) of the base stand where lines
// [otherStart, otherEnd) of the other version do. Either range may be empty. Indexes count from 0.
export interface Hunk {
  baseStart: number;
  baseEnd: number;
  otherStart: number;
  otherEnd: number;
}

// Line-by-line alignment of two versions: the places where they differ, in order. A line differs if its
// text differs or if a stanza break comes before it in one version and not the other. Unchanged lines are
// matched by a longest common subsequence, so the result is deterministic.
export function diffLines(base: ParsedText, other: ParsedText): Hunk[] {
  const key = (t: ParsedText, i: number) => (t.breakBefore[i] ? '\n' : '') + t.lines[i];
  const a = base.lines.map((_, i) => key(base, i));
  const b = other.lines.map((_, i) => key(other, i));

  // lcs[i][j] = length of the longest common subsequence of a[i..] and b[j..]
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const hunks: Hunk[] = [];
  let i = 0;
  let j = 0;
  let gi = 0;
  let gj = 0;
  const close = () => {
    if (gi < i || gj < j) hunks.push({ baseStart: gi, baseEnd: i, otherStart: gj, otherEnd: j });
  };
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      close();
      gi = ++i;
      gj = ++j;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  i = a.length;
  j = b.length;
  close();
  return hunks;
}
