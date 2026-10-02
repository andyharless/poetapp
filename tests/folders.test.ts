import { describe, expect, it } from 'vitest';
import { byName, inFolder, validChoice } from '../src/folders';
import type { Poem } from '../src/model';

const poem = (folderId?: string): Poem => ({
  id: 'p',
  title: 'T',
  author: '',
  lines: ['a'],
  breakBefore: [false],
  createdAt: '2026-01-01',
  folderId,
});

describe('folders', () => {
  const ids = new Set(['f1', 'f2']);

  it('filters poems by folder', () => {
    expect(inFolder(poem('f1'), 'all', ids)).toBe(true);
    expect(inFolder(poem('f1'), 'f1', ids)).toBe(true);
    expect(inFolder(poem('f1'), 'f2', ids)).toBe(false);
    expect(inFolder(poem('f1'), 'unfiled', ids)).toBe(false);
    expect(inFolder(poem(), 'unfiled', ids)).toBe(true);
    // a poem whose folder no longer exists counts as unfiled
    expect(inFolder(poem('gone'), 'unfiled', ids)).toBe(true);
  });

  it('falls back to all poems when the remembered choice no longer applies', () => {
    expect(validChoice(null, ids)).toBe('all');
    expect(validChoice('f2', ids)).toBe('f2');
    expect(validChoice('unfiled', ids)).toBe('unfiled');
    expect(validChoice('gone', ids)).toBe('all');
    expect(validChoice('unfiled', new Set())).toBe('all');
  });

  it('sorts folders by name', () => {
    const f = (id: string, name: string) => ({ id, name });
    expect(byName([f('1', 'Sappho'), f('2', 'Frost'), f('3', 'blake')]).map((x) => x.name)).toEqual([
      'blake',
      'Frost',
      'Sappho',
    ]);
  });
});
