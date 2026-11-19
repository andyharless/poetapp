import type { Backup, Poem } from '../src/model';

// Checks a backup file before it is imported, typically one edited by hand or by an AI.
// docs/backup-format.md describes the format and the rules checked here.

export interface Issue {
  level: 'error' | 'warning';
  message: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PROGRESS = ['lastTested', 'lastFirstPassMisses', 'lastPassed', 'passStreak'] as const;

const isObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const isDate = (x: unknown) => typeof x === 'string' && DATE.test(x) && !isNaN(Date.parse(x));
const nonEmpty = (x: unknown): x is string => typeof x === 'string' && x.trim() !== '';

const lineCount = (p: Poem) => `${p.lines.length} line${p.lines.length === 1 ? '' : 's'}`;

function poemName(p: { title?: unknown; id?: unknown }) {
  return nonEmpty(p.title) ? `"${p.title}"` : `poem ${JSON.stringify(p.id)}`;
}

// Errors make the file unsafe to import; warnings are worth a look but import works.
export function checkBackup(data: unknown): Issue[] {
  const issues: Issue[] = [];
  const error = (message: string) => issues.push({ level: 'error', message });
  const warn = (message: string) => issues.push({ level: 'warning', message });

  if (!isObject(data)) return [{ level: 'error', message: 'The file is not a JSON object.' }];
  if (data.version !== 1) error('"version" must be 1.');
  for (const key of ['poems', 'lineStats', 'attempts'] as const) {
    if (!Array.isArray(data[key])) error(`"${key}" must be an array.`);
  }
  if (data.folders !== undefined && !Array.isArray(data.folders)) error('"folders" must be an array.');
  if (issues.length) return issues;

  const folderIds = new Set<string>();
  for (const [i, f] of (data.folders as unknown[] | undefined ?? []).entries()) {
    if (!isObject(f) || !nonEmpty(f.id) || !nonEmpty(f.name)) {
      error(`Folder ${i + 1} needs a non-empty "id" and "name".`);
      continue;
    }
    if (folderIds.has(f.id)) error(`Folder id "${f.id}" is used more than once.`);
    folderIds.add(f.id);
  }

  const lineCounts = new Map<string, number>();
  for (const [i, p] of (data.poems as unknown[]).entries()) {
    if (!isObject(p)) {
      error(`Poem ${i + 1} is not an object.`);
      continue;
    }
    const name = poemName(p);
    if (!nonEmpty(p.id)) {
      error(`Poem ${i + 1} (${name}) needs a non-empty "id".`);
      continue;
    }
    if (lineCounts.has(p.id)) error(`Poem id "${p.id}" is used more than once.`);
    if (!nonEmpty(p.title)) error(`${name} needs a non-empty "title".`);
    if (typeof p.author !== 'string') error(`${name}: "author" must be a string (it may be empty).`);
    if (!isDate(p.createdAt)) error(`${name}: "createdAt" must be a date like 2026-11-19.`);

    const lines = p.lines;
    if (!Array.isArray(lines) || lines.length === 0) {
      error(`${name}: "lines" must be a non-empty array.`);
      continue;
    }
    lineCounts.set(p.id, lines.length);
    lines.forEach((line, j) => {
      if (typeof line !== 'string' || line.trim() === '') {
        error(`${name}, line ${j + 1}: lines must be non-empty strings; blank lines go in "breakBefore".`);
      } else if (/[\r\n]/.test(line)) {
        error(`${name}, line ${j + 1}: a line must not contain a line break.`);
      } else if (line !== line.trim()) {
        warn(`${name}, line ${j + 1}: leading or trailing spaces (the app trims these).`);
      }
    });
    const bb = p.breakBefore;
    if (!Array.isArray(bb) || bb.length !== lines.length || bb.some((b) => typeof b !== 'boolean')) {
      error(`${name}: "breakBefore" must be an array of ${lines.length} true/false values, one per line.`);
    } else if (bb[0]) {
      warn(`${name}: "breakBefore" for the first line should be false.`);
    }

    if (p.folderId !== undefined) {
      if (typeof p.folderId !== 'string') error(`${name}: "folderId" must be a string.`);
      else if (!folderIds.has(p.folderId)) warn(`${name}: folder "${p.folderId}" isn't in "folders", so it will show as Unfiled.`);
    }
    for (const key of ['lastTested', 'lastPassed'] as const) {
      if (p[key] !== undefined && !isDate(p[key])) error(`${name}: "${key}" must be a date like 2026-11-19.`);
    }
    for (const key of ['lastFirstPassMisses', 'passStreak'] as const) {
      const v = p[key];
      if (v !== undefined && !(Number.isInteger(v) && (v as number) >= 0)) error(`${name}: "${key}" must be a whole number.`);
    }
  }

  let orphanStats = 0;
  for (const s of data.lineStats as unknown[]) {
    if (!isObject(s) || typeof s.poemId !== 'string' || !Number.isInteger(s.lineIndex)) {
      error('Each "lineStats" entry needs a "poemId" and a whole-number "lineIndex".');
      break;
    }
    const n = lineCounts.get(s.poemId);
    if (n === undefined) orphanStats++;
    else if ((s.lineIndex as number) < 0 || (s.lineIndex as number) >= n) {
      error(`"lineStats" for poem "${s.poemId}" refers to line index ${s.lineIndex}, but the poem has ${n} lines.`);
    }
  }
  if (orphanStats) warn(`${orphanStats} "lineStats" entries belong to no poem in the file; import skips them.`);

  let orphanAttempts = 0;
  for (const a of data.attempts as unknown[]) {
    if (!isObject(a) || typeof a.poemId !== 'string' || !isDate(a.date) || !Array.isArray(a.firstPassMisses)) {
      error('Each "attempts" entry needs a "poemId", a "date" and a "firstPassMisses" array.');
      break;
    }
    if (!lineCounts.has(a.poemId)) orphanAttempts++;
  }
  if (orphanAttempts) warn(`${orphanAttempts} "attempts" entries belong to no poem in the file; import skips them.`);

  return issues;
}

export interface Comparison {
  changes: string[]; // what importing the edited file will do
  issues: Issue[]; // edits that import won't carry out as intended
}

// Compares an edited backup with the original it was made from. Both must pass checkBackup.
export function compareBackups(original: Backup, edited: Backup): Comparison {
  const changes: string[] = [];
  const issues: Issue[] = [];
  const warn = (message: string) => issues.push({ level: 'warning', message });

  const oldFolders = new Map((original.folders ?? []).map((f) => [f.id, f]));
  const newFolders = new Map((edited.folders ?? []).map((f) => [f.id, f]));
  const folderName = (id?: string) =>
    (id && (newFolders.get(id) ?? oldFolders.get(id))?.name) || 'Unfiled';

  for (const f of newFolders.values()) {
    const old = oldFolders.get(f.id);
    if (!old) changes.push(`Add folder "${f.name}".`);
    else if (old.name !== f.name) changes.push(`Rename folder "${old.name}" to "${f.name}".`);
  }
  for (const f of oldFolders.values()) {
    if (!newFolders.has(f.id)) warn(`Folder "${f.name}" was removed, but import doesn't delete folders. Delete it in the app.`);
  }

  const history = new Set([...original.lineStats, ...original.attempts].map((x) => x.poemId));
  const oldPoems = new Map(original.poems.map((p) => [p.id, p]));
  const newIds = new Set(edited.poems.map((p) => p.id));

  for (const p of edited.poems) {
    const old = oldPoems.get(p.id);
    const name = `"${p.title}"`;
    if (!old) {
      changes.push(`Add poem ${name}${p.author ? ` by ${p.author}` : ''} (${lineCount(p)}) to ${folderName(p.folderId)}.`);
      if (PROGRESS.some((k) => p[k] !== undefined)) warn(`New poem ${name} has practice-record fields; leave those out of new poems.`);
      continue;
    }
    if (old.title !== p.title) changes.push(`Retitle "${old.title}" as ${name}.`);
    if (old.author !== p.author) changes.push(`Change the author of ${name} from "${old.author}" to "${p.author}".`);
    if ((old.folderId ?? '') !== (p.folderId ?? '')) {
      changes.push(`Move ${name} from ${folderName(old.folderId)} to ${folderName(p.folderId)}.`);
    }
    if (!sameText(old, p)) {
      if (history.has(p.id)) {
        warn(`The text of ${name} changed. Import won't move its practice history to match, so per-line records may land on the wrong lines. Edit the text in the app instead.`);
      } else {
        changes.push(`Replace the text of ${name} (now ${lineCount(p)}).`);
      }
    }
    if (old.createdAt !== p.createdAt || PROGRESS.some((k) => old[k] !== p[k])) {
      warn(`Practice-record fields of ${name} changed; the app maintains these, so leave them as exported.`);
    }
  }
  for (const p of original.poems) {
    if (!newIds.has(p.id)) warn(`Poem "${p.title}" was removed, but import doesn't delete poems. Delete it in the app.`);
  }

  if (JSON.stringify(original.lineStats) !== JSON.stringify(edited.lineStats.filter((s) => oldPoems.has(s.poemId)))) {
    warn('"lineStats" for existing poems changed; leave practice records as exported.');
  }
  if (JSON.stringify(original.attempts) !== JSON.stringify(edited.attempts.filter((a) => oldPoems.has(a.poemId)))) {
    warn('"attempts" for existing poems changed; leave practice records as exported.');
  }

  return { changes, issues };
}

function sameText(a: Poem, b: Poem) {
  return a.lines.join('\n') === b.lines.join('\n') && a.breakBefore.join() === b.breakBefore.join();
}
