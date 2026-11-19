# AI-assisted poem management: design

Status as of 2026-11-19: phase 1 is built; phase 2 is next. Discussion copy (may be out of date):
<https://claude.ai/artifact/QzU8moJG4RD32XL4W1SFS5>. This file is the reference.

## Goals

Let the owner manage the poem list with AI help, for example: "Find a copy of Coleridge's 'Kubla Khan' and add
it to the poems in the folder 'Lyric'."

- **Vendor-neutral.** Nothing may depend on one AI model, provider or harness. Only finding texts on the web
  needs a particular AI's web access, and that step is kept separate from everything else. This rules out an
  assistant built into the app around one provider's API.
- **Accurate texts.** For memorization one wrong word matters. Texts come from cited sources, not an AI's
  memory, and the owner chooses between differing versions.
- **No server.** The app stays on-device. Outside tools work on files moved in and out of the app.
- **Long poems are workable** (a later phase: sections).

## Constraints

All data is in IndexedDB on each device, so outside tools reach it only through backup files.
[backup-format.md](backup-format.md) has the details: import adds or overwrites and never deletes; it doesn't
remap per-line history when text changes; re-importing a stale export overwrites newer practice records.

## Phases

| # | Phase | Status |
| --- | --- | --- |
| 1 | Backup format spec and checker: `docs/backup-format.md`, `tools/backup-check.ts`, `npm run check-backup` | Done (2026-11-19) |
| 2 | Versions format, its spec, and a skill for gathering versions | Next |
| 3 | Comparison and choice in the app (imports a versions file, adds the chosen poem, saves provenance) | |
| 4 | Local MCP server over a backup file, if hand-editing backups proves fragile | Optional |
| 5 | Sections for long poems | Later |

All tooling (specs, checkers, the skill, an MCP server) lives in this repo.

## Adding a poem (path B, decided)

1. An AI with web access finds several versions of the poem, recording where each came from. The owner can
   also supply one or more text files as versions, alongside web results or instead of them.
2. The AI writes them to a **versions file** (below), with its guidance on which to choose.
3. Rhapsode opens the versions file, shows the differences, and adds the poem the owner chooses. There's no
   backup round trip, so no stale-data or deletion problems.

Editing a backup directly (phase 1) remains the route for bulk changes such as reorganizing folders.

### Versions file

JSON. Draft:

```json
{
  "format": "rhapsode-versions",
  "version": 1,
  "title": "Kubla Khan",
  "author": "Samuel Taylor Coleridge",
  "folder": "Lyric",
  "recommendation": {
    "base": "a",
    "summary": "Use the 1816 text; b and c match it apart from the flagged lines.",
    "detail": "Longer reasoning: which editions descend from which, what each editor changed, …"
  },
  "versions": [
    {
      "id": "a",
      "source": "Project Gutenberg, Coleridge's Poems (1912 ed. E. H. Coleridge)",
      "url": "https://…",
      "published": "1816",
      "retrieved": "2026-11-19",
      "text": "In Xanadu did Kubla Khan\nA stately pleasure-dome decree:\n…",
      "notes": "Standard 1816 text",
      "detail": "About this edition and its reliability …"
    }
  ],
  "flags": [
    {
      "version": "b",
      "line": 14,
      "quote": "tbe",
      "kind": "likely-error",
      "suggest": "the",
      "note": "OCR error for \"the\"",
      "detail": "Optional: evidence, other editions checked, …"
    }
  ],
  "sections": [{ "startLine": 1, "label": "I" }]
}
```

- `text` is one plain string with blank lines between stanzas, the same as pasting into the app.
- `source`, `url`, `published`, `retrieved` record provenance. A version from a file the owner supplies has
  the file name as `source` and no `url`.
- A flag's `line` counts the non-blank lines of that version's text, from 1; `quote` keeps the reference
  unambiguous.
- `sections` is optional, reserved for phase 5 so the format needn't change then.

### AI guidance

Three levels, from a one-line verdict to full reasoning:

| Level | Fields | In the app |
| --- | --- | --- |
| Summary | `recommendation.base`, `recommendation.summary` | Top of the comparison, always shown; the base version is preselected |
| Per variant | `flags[]`: `kind`, `note`, `suggest` | Beside the variant, always shown |
| Detail | `detail` on the recommendation, each version and each flag | Hidden behind "More"; saved with the poem |

- Flag kinds: `likely-error` (misprint, OCR error, propagated mistake), `revision` (the author's or an
  editor's deliberate change), `editorial` (modernized spelling or punctuation), `uncertain`.
- Guidance is encouraged: the spec and skill ask for a recommendation and a flag on every variant found, even
  one saying there's no preference. A checker warns when versions differ but guidance is missing, and the app
  says when a file has none.

### Comparison in the app

Alignment is deterministic: line by line, then word by word, showing only where versions differ. The owner
picks a base version (the recommended one preselected), then compares **one other version against the base
at a time**, accepting or rejecting each variant. One pair at a time keeps it readable on a phone.

### Provenance

After the choice, the poem gets an optional `provenance` field (old backups still import): the sources of
all versions and the AI's guidance, not the other versions' texts. It can be viewed from the poem later.
Adding the field means updating `src/model.ts`, the backup spec and the checker together.

### The skill

A SKILL.md-format folder in this repo (the format is used by several agent tools; an AI without skill support
can follow it by reading the file). It covers: gathering versions from the web and/or text files the owner
supplies, recording sources, writing the versions file, and adding guidance.

## Sections (phase 5)

Long poems need splitting into sections of about 50 lines or fewer, at breaks the owner chooses. Today the
owner enters each section as a separate poem.

- Candidate breaks are mechanical (stanza or verse-paragraph breaks, sentence ends); choosing which make units
  the owner can hold in mind is their call. An AI can propose splits; the owner adjusts them, for example by
  tapping lines in the app.
- Real sections: grouped under one poem in the list; transitions practiced (a section is cued by the last
  line or two of the previous one); whole-poem practice once every section is known.
- Existing split poems could be converted by matching titles that share a base name, keeping their history.
