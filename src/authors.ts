import type { Poem } from './model';

// Words after the surname that aren't part of it, as in "Martin Luther King Jr."
const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv']);

// Lowercase words that belong with the surname, as in "Walter de la Mare" or "Ludwig van Beethoven".
const PARTICLES = new Set(['de', 'del', 'della', 'der', 'di', 'da', 'du', 'des', 'la', 'le', 'van', 'von', 'ten', 'ter']);

// The author's surname, guessed from the author field: the part before a comma ("Eliot, T. S."),
// otherwise the last word, along with any lowercase particles before it. Empty if there is no author.
export function surname(author: string): string {
  let name = author.trim().replace(/\s+/g, ' ');
  // drop trailing suffixes, with or without a comma before them
  for (;;) {
    const m = /,?\s*([A-Za-z]+)\.?$/.exec(name);
    if (!m || m.index === 0 || !SUFFIXES.has(m[1].toLowerCase())) break;
    name = name.slice(0, m.index).trim();
  }
  const comma = name.indexOf(',');
  if (comma > 0) return name.slice(0, comma).trim();
  const words = name.split(' ');
  let start = words.length - 1;
  while (start > 1 && PARTICLES.has(words[start - 1])) start--;
  return words.slice(start).join(' ');
}

// By surname, then whole author name, then title. Poems with no author go last.
export function compareByAuthor(a: Poem, b: Poem): number {
  const sa = surname(a.author);
  const sb = surname(b.author);
  if (!sa !== !sb) return sa ? -1 : 1;
  const opts = { sensitivity: 'base' } as const;
  return (
    sa.localeCompare(sb, undefined, opts) ||
    a.author.localeCompare(b.author, undefined, opts) ||
    a.title.localeCompare(b.title)
  );
}
