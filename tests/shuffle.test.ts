import { describe, expect, it } from 'vitest';
import { shuffled } from '../src/shuffle';

const items = Array.from({ length: 20 }, (_, i) => ({ id: `poem${i}` }));

describe('shuffled', () => {
  it('keeps every item', () => {
    expect(shuffled(items, 'a').map((p) => p.id).sort()).toEqual(items.map((p) => p.id).sort());
  });
  it('gives the same order for the same seed', () => {
    expect(shuffled(items, 'a')).toEqual(shuffled([...items].reverse(), 'a'));
  });
  it('gives different orders for different seeds', () => {
    expect(shuffled(items, 'a')).not.toEqual(shuffled(items, 'b'));
  });
});
