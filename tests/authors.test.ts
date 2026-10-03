import { describe, expect, it } from 'vitest';
import { compareByAuthor, surname } from '../src/authors';
import type { Poem } from '../src/model';

const poem = (author: string, title = 'T'): Poem => ({
  id: 'p',
  title,
  author,
  lines: ['a'],
  breakBefore: [false],
  createdAt: '2026-01-01',
});

describe('surname', () => {
  it('takes the last word', () => {
    expect(surname('Emily Dickinson')).toBe('Dickinson');
    expect(surname('T. S. Eliot')).toBe('Eliot');
    expect(surname('  Edgar  Allan Poe ')).toBe('Poe');
  });

  it('uses a single name as is', () => {
    expect(surname('Homer')).toBe('Homer');
    expect(surname('')).toBe('');
  });

  it('takes the part before a comma', () => {
    expect(surname('Eliot, T. S.')).toBe('Eliot');
  });

  it('skips suffixes', () => {
    expect(surname('Martin Luther King, Jr.')).toBe('King');
    expect(surname('Martin Luther King Jr')).toBe('King');
    expect(surname('John Smith III')).toBe('Smith');
  });

  it('keeps lowercase particles with the surname', () => {
    expect(surname('Walter de la Mare')).toBe('de la Mare');
    expect(surname('Ludwig van Beethoven')).toBe('van Beethoven');
    expect(surname('Daphne Du Maurier')).toBe('Maurier');
  });

  it('uses the first name for authors known by it', () => {
    expect(surname('Dante Alighieri')).toBe('Dante');
    expect(surname('dante  aligheri')).toBe('Dante');
    expect(surname('Michelangelo Buonarroti')).toBe('Michelangelo');
    expect(surname('Leonardo da Vinci')).toBe('Leonardo');
    expect(surname('Dante Gabriel Rossetti')).toBe('Rossetti');
  });
});

describe('compareByAuthor', () => {
  it('sorts by surname, then author, then title, with no author last', () => {
    const poems = [
      poem('', 'Anon'),
      poem('Percy Bysshe Shelley', 'Ozymandias'),
      poem('Mary Shelley', 'B'),
      poem('Mary Shelley', 'A'),
      poem('Emily Brontë'),
      poem('Elizabeth Bishop'),
    ];
    expect(poems.sort(compareByAuthor).map((p) => `${p.author}/${p.title}`)).toEqual([
      'Elizabeth Bishop/T',
      'Emily Brontë/T',
      'Mary Shelley/A',
      'Mary Shelley/B',
      'Percy Bysshe Shelley/Ozymandias',
      '/Anon',
    ]);
  });
});
