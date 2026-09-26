export interface ParsedText {
  lines: string[];
  breakBefore: boolean[];
}

// Blank lines are stanza breaks: kept for display, never quizzed.
export function parseText(text: string): ParsedText {
  const lines: string[] = [];
  const breakBefore: boolean[] = [];
  let pendingBreak = false;

  for (const raw of text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/)) {
    const line = raw.trim();
    if (line === '') {
      pendingBreak = lines.length > 0;
      continue;
    }
    lines.push(line);
    breakBefore.push(pendingBreak);
    pendingBreak = false;
  }
  return { lines, breakBefore };
}

// Inverse of parseText, for editing: one line per line, a blank line before each stanza.
export function formatText({ lines, breakBefore }: ParsedText): string {
  return lines.map((line, i) => (breakBefore[i] ? `\n${line}` : line)).join('\n');
}
