import { describe, expect, it } from 'vitest';
import { checkBackup, compareBackups } from '../tools/backup-check';
import type { Backup, Poem } from '../src/model';

const poem = (over: Partial<Poem> = {}): Poem => ({
  id: 'p1',
  title: 'Kubla Khan',
  author: 'Samuel Taylor Coleridge',
  lines: ['In Xanadu did Kubla Khan', 'A stately pleasure-dome decree:'],
  breakBefore: [false, false],
  createdAt: '2026-11-19',
  ...over,
});

const backup = (over: Partial<Backup> = {}): Backup => ({
  version: 1,
  folders: [{ id: 'f1', name: 'Lyric' }],
  poems: [poem()],
  lineStats: [],
  attempts: [],
  ...over,
});

const messages = (issues: { level: string; message: string }[], level: string) =>
  issues.filter((i) => i.level === level).map((i) => i.message);

describe('checkBackup', () => {
  it('accepts a valid backup', () => {
    expect(checkBackup(backup())).toEqual([]);
  });

  it('accepts a backup made before folders existed', () => {
    const b: Partial<Backup> = backup();
    delete b.folders;
    expect(checkBackup(b)).toEqual([]);
  });

  it('rejects files that are not backups', () => {
    expect(messages(checkBackup([]), 'error')).toHaveLength(1);
    expect(messages(checkBackup({ version: 2, poems: [], lineStats: [], attempts: [] }), 'error')).toEqual([
      '"version" must be 1.',
    ]);
    expect(messages(checkBackup({ version: 1, poems: [] }), 'error')).toHaveLength(2);
  });

  it('requires breakBefore to match lines', () => {
    const errors = messages(checkBackup(backup({ poems: [poem({ breakBefore: [false] })] })), 'error');
    expect(errors).toEqual(['"Kubla Khan": "breakBefore" must be an array of 2 true/false values, one per line.']);
  });

  it('rejects blank lines and lines with line breaks', () => {
    const b = backup({ poems: [poem({ lines: ['one', ''], breakBefore: [false, false] })] });
    expect(messages(checkBackup(b), 'error')).toHaveLength(1);
    const c = backup({ poems: [poem({ lines: ['one\ntwo'], breakBefore: [false] })] });
    expect(messages(checkBackup(c), 'error')).toEqual(['"Kubla Khan", line 1: a line must not contain a line break.']);
  });

  it('rejects duplicate ids and missing fields', () => {
    const b = backup({ poems: [poem(), poem({ title: '' })] });
    expect(messages(checkBackup(b), 'error')).toEqual([
      'Poem id "p1" is used more than once.',
      'poem "p1" needs a non-empty "title".',
    ]);
    expect(messages(checkBackup(backup({ poems: [poem({ createdAt: '19 Nov 2026' })] })), 'error')).toHaveLength(1);
  });

  it('warns about unknown folders and records for missing poems', () => {
    const b = backup({
      poems: [poem({ folderId: 'nope' })],
      lineStats: [{ poemId: 'gone', lineIndex: 0, missCount: 0, testCount: 1 }],
    });
    expect(checkBackup(b)).toEqual([
      { level: 'warning', message: `"Kubla Khan": folder "nope" isn't in "folders", so it will show as Unfiled.` },
      { level: 'warning', message: '1 "lineStats" entries belong to no poem in the file; import skips them.' },
    ]);
  });

  it('rejects line records past the end of the poem', () => {
    const b = backup({ lineStats: [{ poemId: 'p1', lineIndex: 2, missCount: 0, testCount: 1 }] });
    expect(messages(checkBackup(b), 'error')).toHaveLength(1);
  });
});

describe('compareBackups', () => {
  it('lists added folders and poems', () => {
    const edited = backup({
      folders: [{ id: 'f1', name: 'Lyric' }, { id: 'f2', name: 'Elegy' }],
      poems: [poem(), poem({ id: 'p2', title: 'Lycidas', author: 'John Milton', folderId: 'f2' })],
    });
    expect(compareBackups(backup(), edited)).toEqual({
      changes: ['Add folder "Elegy".', 'Add poem "Lycidas" by John Milton (2 lines) to Elegy.'],
      issues: [],
    });
  });

  it('lists moves and renames', () => {
    const edited = backup({ folders: [{ id: 'f1', name: 'Lyrics' }], poems: [poem({ folderId: 'f1' })] });
    expect(compareBackups(backup(), edited).changes).toEqual([
      'Rename folder "Lyric" to "Lyrics".',
      'Move "Kubla Khan" from Unfiled to Lyrics.',
    ]);
  });

  it('warns that deletions are not imported', () => {
    const { changes, issues } = compareBackups(backup(), backup({ folders: [], poems: [] }));
    expect(changes).toEqual([]);
    expect(messages(issues, 'warning')).toHaveLength(2);
  });

  it('allows text changes only for poems without history', () => {
    const edited = backup({ poems: [poem({ lines: ['In Xanadu'], breakBefore: [false] })] });
    expect(compareBackups(backup(), edited)).toEqual({
      changes: ['Replace the text of "Kubla Khan" (now 1 line).'],
      issues: [],
    });
    const stats = [{ poemId: 'p1', lineIndex: 0, missCount: 1, testCount: 2 }];
    const withHistory = compareBackups(backup({ lineStats: stats }), { ...edited, lineStats: stats });
    expect(withHistory.changes).toEqual([]);
    expect(withHistory.issues).toHaveLength(1);
  });

  it('warns about edited practice records', () => {
    const edited = backup({ poems: [poem({ passStreak: 3 })] });
    expect(messages(compareBackups(backup(), edited).issues, 'warning')).toHaveLength(1);
    const newWithRecords = backup({ poems: [poem(), poem({ id: 'p2', lastTested: '2026-11-19' })] });
    expect(messages(compareBackups(backup(), newWithRecords).issues, 'warning')).toHaveLength(1);
  });
});
