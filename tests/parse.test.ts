import { describe, expect, it } from 'vitest';
import { formatText, parseText } from '../src/parse';

describe('parseText', () => {
  it('splits lines and marks stanza breaks', () => {
    const r = parseText('a\nb\n\nc\n\n\nd');
    expect(r.lines).toEqual(['a', 'b', 'c', 'd']);
    expect(r.breakBefore).toEqual([false, false, true, true]);
  });

  it('ignores leading/trailing blanks, whitespace and CRLF', () => {
    const r = parseText('\n\n  one  \r\ntwo\r\n\r\n');
    expect(r.lines).toEqual(['one', 'two']);
    expect(r.breakBefore).toEqual([false, false]);
  });

  it('strips a BOM and keeps Greek and RTL text intact', () => {
    const r = parseText('\uFEFFμῆνιν ἄειδε θεὰ\nשלום עולם');
    expect(r.lines).toEqual(['μῆνιν ἄειδε θεὰ', 'שלום עולם']);
  });

  it('returns nothing for empty input', () => {
    expect(parseText('  \n\n').lines).toEqual([]);
  });
});

describe('formatText', () => {
  it('round-trips through parseText', () => {
    const r = parseText('a\nb\n\nc\n\n\nd');
    expect(formatText(r)).toBe('a\nb\n\nc\n\nd');
    expect(parseText(formatText(r))).toEqual(r);
  });
});
