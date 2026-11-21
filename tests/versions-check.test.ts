import { describe, expect, it } from 'vitest';
import { checkVersions, summarizeVersions } from '../tools/versions-check';
import { diffLines, type VersionsFile } from '../src/versions';
import { parseText } from '../src/parse';

const A = 'In Xanadu did Kubla Khan\nA stately pleasure-dome decree:\n\nWhere Alph, the sacred river, ran';
const B = 'In Xanadu did Kubla Khan\nA stately pleasure-dome decree:\n\nWhere Alph, tbe sacred river, ran';

const file = (over: Partial<VersionsFile> = {}): VersionsFile => ({
  format: 'rhapsode-versions',
  version: 1,
  title: 'Kubla Khan',
  author: 'Samuel Taylor Coleridge',
  folder: 'Lyric',
  recommendation: { base: 'a', summary: 'Use the 1816 text.' },
  versions: [
    { id: 'a', source: 'Christabel, Kubla Khan, and the Pains of Sleep', published: '1816', text: A },
    { id: 'b', source: 'scan.txt', text: B },
  ],
  flags: [{ version: 'b', line: 3, quote: 'tbe', kind: 'likely-error', suggest: 'the', note: 'OCR error' }],
  ...over,
});

const messages = (issues: { level: string; message: string }[], level: string) =>
  issues.filter((i) => i.level === level).map((i) => i.message);

describe('diffLines', () => {
  const d = (a: string, b: string) => diffLines(parseText(a), parseText(b));

  it('finds nothing in identical texts', () => {
    expect(d(A, A)).toEqual([]);
  });

  it('finds changed, added and removed lines', () => {
    expect(d(A, B)).toEqual([{ baseStart: 2, baseEnd: 3, otherStart: 2, otherEnd: 3 }]);
    expect(d('one\ntwo\nthree', 'one\nthree')).toEqual([{ baseStart: 1, baseEnd: 2, otherStart: 1, otherEnd: 1 }]);
    expect(d('one\nthree', 'zero\none\nthree\nfour')).toEqual([
      { baseStart: 0, baseEnd: 0, otherStart: 0, otherEnd: 1 },
      { baseStart: 2, baseEnd: 2, otherStart: 3, otherEnd: 4 },
    ]);
  });

  it('counts a moved stanza break as a difference', () => {
    expect(d('one\ntwo\n\nthree', 'one\n\ntwo\nthree')).toEqual([{ baseStart: 1, baseEnd: 3, otherStart: 1, otherEnd: 3 }]);
  });
});

describe('checkVersions', () => {
  it('accepts a valid file', () => {
    expect(checkVersions(file())).toEqual([]);
  });

  it('accepts a single version with no guidance', () => {
    expect(checkVersions(file({ recommendation: undefined, flags: undefined, versions: [file().versions[0]] }))).toEqual([]);
  });

  it('rejects files that are not versions files', () => {
    expect(messages(checkVersions([]), 'error')).toHaveLength(1);
    expect(messages(checkVersions({ version: 1, poems: [] }), 'error')).toEqual([
      '"format" must be "rhapsode-versions".',
      '"title" must be a non-empty string.',
      '"author" must be a string (it may be empty).',
      '"versions" must be a non-empty array.',
    ]);
  });

  it('checks versions', () => {
    const f = file({
      versions: [
        { id: 'a', source: '', text: A, retrieved: 'Nov 19' },
        { id: 'a', source: 'x', text: '\n\n' },
      ],
    });
    expect(messages(checkVersions(f), 'error')).toEqual([
      'Version "a" needs a non-empty "source".',
      'Version "a": "retrieved" must be a date like 2026-11-19.',
      'Version id "a" is used more than once.',
      'Version "a": "text" has no lines.',
      'Flag 1: "version" must be the id of a version with text.',
    ]);
  });

  it('checks that a flag points at its quote', () => {
    const wrongLine = file({ flags: [{ ...file().flags![0], line: 2 }] });
    expect(messages(checkVersions(wrongLine), 'error')).toEqual([
      'Flag 1: "quote" "tbe" is not in line 2 of version "b", which reads "A stately pleasure-dome decree:".',
    ]);
    const pastEnd = file({ flags: [{ ...file().flags![0], line: 4 }] });
    expect(messages(checkVersions(pastEnd), 'error')).toHaveLength(1);
    const badKind = file({ flags: [{ ...file().flags![0], kind: 'typo' as never }] });
    expect(messages(checkVersions(badKind), 'error')).toHaveLength(1);
  });

  it('requires the recommended base to be a version', () => {
    const f = file({ recommendation: { base: 'z', summary: 'Use z.' } });
    expect(messages(checkVersions(f), 'error')).toEqual(['"recommendation"."base" is "z", which is not the id of a version with text.']);
  });

  it('warns when guidance is missing', () => {
    expect(messages(checkVersions(file({ recommendation: undefined })), 'warning')).toEqual([
      'The versions differ but there is no "recommendation". Add one saying which version to start from and why.',
    ]);
    expect(messages(checkVersions(file({ flags: [] })), 'warning')).toEqual([
      `Version "b" differs from "a" with no flag at 1 place: line 3. Add a flag for each, even one saying there's no preference.`,
    ]);
  });

  it('accepts a flag on the base version or beside a missing line', () => {
    const onBase = file({ flags: [{ version: 'a', line: 3, quote: 'the', kind: 'uncertain', note: 'b differs' }] });
    expect(checkVersions(onBase)).toEqual([]);
    const shorter = file({
      versions: [file().versions[0], { id: 'b', source: 'x', text: 'In Xanadu did Kubla Khan\n\nWhere Alph, the sacred river, ran' }],
      flags: [{ version: 'b', line: 1, quote: 'Khan', kind: 'likely-error', note: 'line 2 is missing' }],
    });
    expect(checkVersions(shorter)).toEqual([]);
  });

  it('warns about unknown fields and copied page furniture', () => {
    const f = file({
      versions: [{ ...file().versions[0], text: `${A}\n5\nAnd here a line  10\nA&nbsp;line` }, file().versions[1]],
      flags: [...file().flags!, { version: 'a', line: 4, quote: 'Alph', kind: 'editorial', note: 'base', extra: 1 } as never],
    });
    expect(messages(checkVersions(f), 'warning')).toEqual([
      'Version "a" has 1 line of only a number (line or page numbers?).',
      'Version "a" has 1 line ending in spaces and a number (line numbers?).',
      'Version "a": the text contains HTML tags or entities such as &nbsp;.',
      'Flag 2: unknown field "extra" (ignored).',
    ]);
  });

  it('checks sections against the base version', () => {
    expect(checkVersions(file({ sections: [{ startLine: 1 }, { startLine: 3, label: 'II' }] }))).toEqual([]);
    expect(messages(checkVersions(file({ sections: [{ startLine: 1 }, { startLine: 1 }, { startLine: 9 }] })), 'error')).toEqual([
      `Section 2: "startLine" must be greater than the previous section's.`,
      'Section 3: "startLine" 9 is past the last line of the base version (3).',
    ]);
  });
});

describe('summarizeVersions', () => {
  it('describes the poem and how the versions compare', () => {
    expect(summarizeVersions(file())).toEqual([
      '"Kubla Khan" by Samuel Taylor Coleridge, to go in Lyric.',
      'Recommended base: "a". Use the 1816 text.',
      '"a": 3 lines, Christabel, Kubla Khan, and the Pains of Sleep (1816).',
      '"b": 3 lines, scan.txt; differs from "a" at 1 place; 1 flag.',
    ]);
  });
});
