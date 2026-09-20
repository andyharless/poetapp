export interface Poem {
  id: string;
  title: string;
  author: string;
  lines: string[];
  breakBefore: boolean[]; // parallel to lines: blank line(s) preceded this line
  createdAt: string; // yyyy-mm-dd
  lastTested?: string; // yyyy-mm-dd
  lastFirstPassMisses?: number;
}

export interface LineStats {
  poemId: string;
  lineIndex: number;
  missCount: number;
  testCount: number;
  lastMissed?: string;
}

export interface Attempt {
  poemId: string;
  date: string;
  firstPassMisses: number[];
  totalLines: number;
}

export interface Backup {
  version: 1;
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
