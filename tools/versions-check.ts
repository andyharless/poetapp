import { parseText, type ParsedText } from '../src/parse.ts';
import { diffLines, FLAG_KINDS, type Hunk, type VersionsFile } from '../src/versions.ts';
import type { Issue } from './backup-check.ts';

// Checks a versions file, typically one written by an AI gathering versions of a poem.
// docs/versions-format.md describes the format and the rules checked here.

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TOP_KEYS = ['format', 'version', 'title', 'author', 'folder', 'recommendation', 'versions', 'flags', 'sections'];
const RECOMMENDATION_KEYS = ['base', 'summary', 'detail'];
const VERSION_KEYS = ['id', 'source', 'url', 'published', 'retrieved', 'text', 'notes', 'detail'];
const FLAG_KEYS = ['version', 'line', 'quote', 'kind', 'suggest', 'note', 'detail'];
const SECTION_KEYS = ['startLine', 'label'];

const isObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const isDate = (x: unknown) => typeof x === 'string' && DATE.test(x) && !isNaN(Date.parse(x));
const nonEmpty = (x: unknown): x is string => typeof x === 'string' && x.trim() !== '';
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Errors make the file unusable; warnings point to likely mistakes or missing guidance.
export function checkVersions(data: unknown): Issue[] {
  const issues: Issue[] = [];
  const error = (message: string) => issues.push({ level: 'error', message });
  const warn = (message: string) => issues.push({ level: 'warning', message });
  const unknownKeys = (obj: Record<string, unknown>, known: string[], where: string) => {
    for (const k of Object.keys(obj)) if (!known.includes(k)) warn(`${where}: unknown field "${k}" (ignored).`);
  };
  const optionalString = (obj: Record<string, unknown>, key: string, where: string) => {
    if (obj[key] !== undefined && typeof obj[key] !== 'string') error(`${where}: "${key}" must be a string.`);
  };

  if (!isObject(data)) return [{ level: 'error', message: 'The file is not a JSON object.' }];
  if (data.format !== 'rhapsode-versions') error('"format" must be "rhapsode-versions".');
  if (data.version !== 1) error('"version" must be 1.');
  if (!nonEmpty(data.title)) error('"title" must be a non-empty string.');
  if (typeof data.author !== 'string') error('"author" must be a string (it may be empty).');
  if (data.folder !== undefined && !nonEmpty(data.folder)) error('"folder" must be a non-empty string; leave it out for Unfiled.');
  unknownKeys(data, TOP_KEYS, 'Top level');
  if (!Array.isArray(data.versions) || data.versions.length === 0) {
    error('"versions" must be a non-empty array.');
    return issues;
  }

  // Versions
  const texts = new Map<string, ParsedText>();
  for (const [i, v] of (data.versions as unknown[]).entries()) {
    if (!isObject(v)) {
      error(`Version ${i + 1} is not an object.`);
      continue;
    }
    if (!nonEmpty(v.id)) {
      error(`Version ${i + 1} needs a non-empty "id".`);
      continue;
    }
    const name = `Version "${v.id}"`;
    if (texts.has(v.id)) error(`Version id "${v.id}" is used more than once.`);
    unknownKeys(v, VERSION_KEYS, name);
    if (!nonEmpty(v.source)) error(`${name} needs a non-empty "source".`);
    for (const key of ['url', 'published', 'notes', 'detail']) optionalString(v, key, name);
    if (typeof v.url === 'string' && !/^https?:\/\/\S+$/.test(v.url)) warn(`${name}: "url" doesn't look like a web address.`);
    if (v.retrieved !== undefined && !isDate(v.retrieved)) error(`${name}: "retrieved" must be a date like 2026-11-19.`);
    if (typeof v.url === 'string' && v.retrieved === undefined) warn(`${name} has a "url" but no "retrieved" date.`);

    if (typeof v.text !== 'string') {
      error(`${name}: "text" must be a string.`);
      continue;
    }
    const parsed = parseText(v.text);
    if (parsed.lines.length === 0) {
      error(`${name}: "text" has no lines.`);
      continue;
    }
    texts.set(v.id, parsed);
    checkText(parsed, name, warn);
  }

  // Recommendation
  const rec = data.recommendation;
  let base: string | undefined;
  if (rec !== undefined) {
    if (!isObject(rec)) {
      error('"recommendation" must be an object.');
    } else {
      unknownKeys(rec, RECOMMENDATION_KEYS, '"recommendation"');
      if (!nonEmpty(rec.base)) error('"recommendation" needs a "base": the id of the version to start from.');
      else if (!texts.has(rec.base)) error(`"recommendation"."base" is "${rec.base}", which is not the id of a version with text.`);
      else base = rec.base;
      if (!nonEmpty(rec.summary)) error('"recommendation" needs a non-empty "summary".');
      optionalString(rec, 'detail', '"recommendation"');
    }
  }

  // Flags
  const flags: { version: string; line: number }[] = [];
  if (data.flags !== undefined && !Array.isArray(data.flags)) error('"flags" must be an array.');
  for (const [i, f] of (Array.isArray(data.flags) ? data.flags : []).entries()) {
    const name = `Flag ${i + 1}`;
    if (!isObject(f)) {
      error(`${name} is not an object.`);
      continue;
    }
    unknownKeys(f, FLAG_KEYS, name);
    if (!FLAG_KINDS.includes(f.kind as never)) error(`${name}: "kind" must be one of ${FLAG_KINDS.map((k) => `"${k}"`).join(', ')}.`);
    if (!nonEmpty(f.note)) error(`${name} needs a non-empty "note".`);
    for (const key of ['suggest', 'detail']) optionalString(f, key, name);
    if (!nonEmpty(f.quote)) error(`${name} needs a non-empty "quote": the words in the line it is about.`);
    const text = typeof f.version === 'string' ? texts.get(f.version) : undefined;
    if (!text) {
      error(`${name}: "version" must be the id of a version with text.`);
      continue;
    }
    const line = f.line;
    if (!Number.isInteger(line) || (line as number) < 1 || (line as number) > text.lines.length) {
      error(`${name}: "line" must be a whole number from 1 to ${text.lines.length}, counting the non-blank lines of version "${f.version}".`);
      continue;
    }
    const lineText = text.lines[(line as number) - 1];
    if (nonEmpty(f.quote) && !lineText.includes(f.quote)) {
      error(`${name}: "quote" ${JSON.stringify(f.quote)} is not in line ${line} of version "${f.version}", which reads ${JSON.stringify(lineText)}.`);
      continue;
    }
    flags.push({ version: f.version as string, line: (line as number) - 1 });
  }

  // Sections (reserved for long poems): they count the lines of the base version.
  if (data.sections !== undefined) {
    if (!Array.isArray(data.sections)) {
      error('"sections" must be an array.');
    } else {
      const baseText = base ? texts.get(base) : texts.size === 1 ? [...texts.values()][0] : undefined;
      if (!baseText) warn('"sections" count the lines of the base version, so they need a "recommendation" with a "base".');
      let previous = 0;
      for (const [i, s] of data.sections.entries()) {
        const name = `Section ${i + 1}`;
        if (!isObject(s) || !Number.isInteger(s.startLine) || (s.startLine as number) < 1) {
          error(`${name} needs a whole-number "startLine" of 1 or more.`);
          continue;
        }
        unknownKeys(s, SECTION_KEYS, name);
        optionalString(s, 'label', name);
        const start = s.startLine as number;
        if (start <= previous) error(`${name}: "startLine" must be greater than the previous section's.`);
        if (baseText && start > baseText.lines.length) error(`${name}: "startLine" ${start} is past the last line of the base version (${baseText.lines.length}).`);
        if (i === 0 && start !== 1) warn('The first section should start at line 1.');
        previous = start;
      }
    }
  }

  if (issues.some((i) => i.level === 'error')) return issues;

  // Guidance: a recommendation when the versions differ, and a flag on every place they differ.
  const ids = [...texts.keys()];
  const differ = ids.some((id) => diffLines(texts.get(ids[0])!, texts.get(id)!).length > 0);
  if (differ && !base) {
    warn('The versions differ but there is no "recommendation". Add one saying which version to start from and why.');
  }
  if (base) {
    for (const id of ids) {
      if (id === base) continue;
      const unflagged = diffLines(texts.get(base)!, texts.get(id)!).filter((h) => !covered(h, flags, base, id));
      if (unflagged.length) {
        warn(`Version "${id}" differs from "${base}" with no flag at ${plural(unflagged.length, 'place')}: ${unflagged.map(where).join('; ')}. Add a flag for each, even one saying there's no preference.`);
      }
    }
  }
  return issues;
}

// Signs that text was copied with page furniture or markup that doesn't belong in the poem.
function checkText({ lines }: ParsedText, name: string, warn: (m: string) => void) {
  const numbersOnly = lines.filter((l) => /^[(\[]?\d+[.)\]]?$/.test(l)).length;
  if (numbersOnly) warn(`${name} has ${plural(numbersOnly, 'line')} of only a number (line or page numbers?).`);
  const trailingNumbers = lines.filter((l) => /\S\s{2,}\d+$/.test(l)).length;
  if (trailingNumbers) warn(`${name} has ${plural(trailingNumbers, 'line')} ending in spaces and a number (line numbers?).`);
  if (lines.some((l) => /<\/?[a-z][^>]*>|&(#\d+|#x[\da-f]+|[a-z]+);/i.test(l))) {
    warn(`${name}: the text contains HTML tags or entities such as &nbsp;.`);
  }
}

// Whether a flag on either version points into the hunk. For lines present in only one version, a flag
// on the line just before or after the gap in the other version also counts.
function covered(h: Hunk, flags: { version: string; line: number }[], base: string, other: string) {
  const inRange = (line: number, start: number, end: number) =>
    start < end ? line >= start && line < end : line >= start - 1 && line <= start;
  return flags.some(
    (f) =>
      (f.version === other && inRange(f.line, h.otherStart, h.otherEnd)) ||
      (f.version === base && inRange(f.line, h.baseStart, h.baseEnd)),
  );
}

// A hunk's position in the other version's line numbers, from 1.
function where(h: Hunk) {
  if (h.otherStart === h.otherEnd) return h.otherStart === 0 ? 'before line 1' : `after line ${h.otherStart}`;
  return h.otherEnd - h.otherStart === 1 ? `line ${h.otherStart + 1}` : `lines ${h.otherStart + 1}–${h.otherEnd}`;
}

// A short description of a valid versions file: the poem, the recommendation, and how each version
// compares with the base.
export function summarizeVersions(file: VersionsFile): string[] {
  const out = [`"${file.title}"${file.author ? ` by ${file.author}` : ''}, to go in ${file.folder ?? 'Unfiled'}.`];
  const base = file.recommendation?.base;
  if (file.recommendation) out.push(`Recommended base: "${base}". ${file.recommendation.summary}`);
  const texts = new Map(file.versions.map((v) => [v.id, parseText(v.text)]));
  const flagCount = (id: string) => (file.flags ?? []).filter((f) => f.version === id).length;
  for (const v of file.versions) {
    const t = texts.get(v.id)!;
    let line = `"${v.id}": ${plural(t.lines.length, 'line')}, ${v.source}${v.published ? ` (${v.published})` : ''}`;
    if (base && v.id !== base) {
      const n = diffLines(texts.get(base)!, t).length;
      line += n ? `; differs from "${base}" at ${plural(n, 'place')}` : `; same text as "${base}"`;
    }
    const flags = flagCount(v.id);
    if (flags) line += `; ${plural(flags, 'flag')}`;
    out.push(line + '.');
  }
  return out;
}
