// A random order that stays put until the seed changes, so the list doesn't reshuffle
// every time you come back to it. Each id gets a pseudo-random rank from the seed.
function rank(seed: string, id: string): number {
  // FNV-1a
  let h = 0x811c9dc5;
  for (const c of `${seed}:${id}`) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function shuffled<T extends { id: string }>(items: T[], seed: string): T[] {
  return [...items].sort((a, b) => rank(seed, a.id) - rank(seed, b.id) || a.id.localeCompare(b.id));
}

export function newSeed(): string {
  return Math.random().toString(36).slice(2);
}
