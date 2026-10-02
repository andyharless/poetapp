export interface Poem {
  id: string;
  title: string;
  author: string;
  lines: string[];
  breakBefore: boolean[]; // parallel to lines: blank line(s) preceded this line
  createdAt: string; // yyyy-mm-dd
  lastTested?: string; // yyyy-mm-dd
  lastFirstPassMisses?: number;
  lastPassed?: string; // yyyy-mm-dd: last whole-poem run-through with zero first-pass misses
  folderId?: string; // undefined (or a deleted folder's id): unfiled
  passStreak?: number; // whole-poem run-throughs in a row, up to the latest, with zero first-pass misses
}

export interface LineStats {
  poemId: string;
  lineIndex: number;
  missCount: number;
  testCount: number;
  lastMissed?: string;
  lastOutcome?: 'hit' | 'miss'; // result of the line's most recent first try
}

export interface Attempt {
  poemId: string;
  date: string;
  firstPassMisses: number[];
  totalLines: number;
  lines?: number[]; // only for partial sessions (missed lines only): the lines asked
}

// Poems can be sorted into folders, at most one folder per poem.
export interface Folder {
  id: string;
  name: string;
}

export interface Backup {
  version: 1;
  folders?: Folder[]; // absent in backups made before folders existed
  poems: Poem[];
  lineStats: LineStats[];
  attempts: Attempt[];
}

export function today(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
