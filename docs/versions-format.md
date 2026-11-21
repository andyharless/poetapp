# Rhapsode versions file format

A **versions file** holds several versions of one poem (from different editions, websites or text files),
where each came from, and guidance on which to choose. An AI with web access, or a person, writes it; Rhapsode
will open it, show where the versions differ, and add the version the owner chooses. Any AI that can read and
write files can follow this; nothing here depends on a particular one. The skill in
[skills/poem-versions/SKILL.md](../skills/poem-versions/SKILL.md) gives step-by-step instructions for
gathering versions and writing the file.

Why: for memorization one wrong word matters, and printed texts of the same poem differ through misprints, OCR
errors, revisions and modernized spelling. Texts come from cited sources, not from an AI's memory, and the
owner makes the final choice.

> Status: Rhapsode can't open versions files yet (that comes next; see
> [ai-poem-management.md](ai-poem-management.md)). Until then, paste the chosen text into **Add poem**.

## Checking a file

```sh
npm run check-versions -- kubla-khan.versions.json
```

It reports errors that make the file unusable, warns about likely mistakes (such as line numbers copied into
the text) and missing guidance, and summarizes how each version compares with the recommended one. Name files
`<title>.versions.json`.

## Example

```json
{
  "format": "rhapsode-versions",
  "version": 1,
  "title": "Kubla Khan",
  "author": "Samuel Taylor Coleridge",
  "folder": "Lyric",
  "recommendation": {
    "base": "a",
    "summary": "Use the 1816 text; b matches it apart from one OCR error.",
    "detail": "Longer reasoning: which editions descend from which, what each editor changed, …"
  },
  "versions": [
    {
      "id": "a",
      "source": "Project Gutenberg, The Poems of Samuel Taylor Coleridge (1912, ed. E. H. Coleridge)",
      "url": "https://www.gutenberg.org/…",
      "published": "1816",
      "retrieved": "2026-11-21",
      "text": "In Xanadu did Kubla Khan\nA stately pleasure-dome decree:\n…",
      "notes": "Standard 1816 text",
      "detail": "About this edition and its reliability …"
    },
    {
      "id": "b",
      "source": "kubla-khan-scan.txt",
      "text": "In Xanadu did Kubla Khan\nA stately pleasure-dome decree:\n…"
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
  ]
}
```

## Fields

### Top level

| Field | Type | Notes |
| --- | --- | --- |
| `format` | string | Always `"rhapsode-versions"`. |
| `version` | number | Always `1`. |
| `title` | string | Required, not empty. The title the poem will have in Rhapsode. |
| `author` | string | May be `""`. |
| `folder` | string | Optional. The name of the folder to add the poem to (created if it doesn't exist); leave it out for Unfiled. |
| `recommendation` | object | Which version to start from and why. Expected whenever the versions differ. |
| `versions` | array | Required, at least one. |
| `flags` | array | Optional. Notes on the places where versions differ. |
| `sections` | array | Optional, reserved for splitting long poems into sections (not used yet). |

### Versions

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Required, unique within the file. Short ids such as `"a"`, `"b"` are fine. |
| `source` | string | Required. The edition or site, as specifically as known; for a text file the owner supplied, its file name. |
| `url` | string | The page the text was taken from. Leave it out for a file the owner supplied. |
| `published` | string | When this text was published, as precisely as known: `"1816"`, `"1834 (revised)"`. |
| `retrieved` | string | Date the text was fetched, `YYYY-MM-DD`. Expected with `url`. |
| `text` | string | Required. The poem as plain text: one line per line of verse, a blank line between stanzas (`\n\n` in JSON), as if pasted into the app. |
| `notes` | string | Optional. A short note shown beside the version. |
| `detail` | string | Optional. Longer background, hidden behind "More". |

Copy the text exactly as the source has it: spelling, capitals and punctuation.
Remove only what isn't part of the poem: line numbers, page numbers and headers, footnote markers, HTML.
Leading and trailing spaces on each line are ignored, as in the app.

### Recommendation

| Field | Type | Notes |
| --- | --- | --- |
| `base` | string | Required. The `id` of the version to start from. The app preselects it. |
| `summary` | string | Required. One or two sentences, always shown. |
| `detail` | string | Optional. Full reasoning, hidden behind "More" and saved with the poem. |

### Flags

A flag is a note on one place where versions differ, attached to a line of one version.

| Field | Type | Notes |
| --- | --- | --- |
| `version` | string | Required. The `id` of the version the line is in. |
| `line` | number | Required. Counts the **non-blank** lines of that version's text, from 1 (stanza breaks don't count). |
| `quote` | string | Required. The words in that line the flag is about, copied exactly; it must appear in the line. |
| `kind` | string | Required. One of `likely-error`, `revision`, `editorial`, `uncertain` (below). |
| `suggest` | string | Optional. What the quoted words should be, if the flag is a correction. |
| `note` | string | Required. A short explanation, shown beside the variant. |
| `detail` | string | Optional. Evidence, other editions checked, …; hidden behind "More". |

Kinds:

- `likely-error`: a misprint, OCR error or mistake copied from another edition.
- `revision`: a deliberate change by the author or an editor, such as a later revised text.
- `editorial`: modernized or regularized spelling or punctuation.
- `uncertain`: it's unclear which reading is right.

Put a flag on **every** place where a version differs from the base, even if only to say there's no reason to
prefer either reading. The place is usually best flagged on the other version's line; flag the base's line
when the other version lacks it, or flag the other version's line just before or after the gap. A stanza
break present in one version and not the other also counts as a difference.

### Sections (reserved)

```json
"sections": [{ "startLine": 1, "label": "I" }, { "startLine": 37, "label": "II" }]
```

For long poems, places to split them into sections of about 50 lines or fewer. `startLine` counts the
non-blank lines of the recommended base version, from 1, in increasing order; `label` is optional. Rhapsode
doesn't use sections yet, so leave this out unless asked.

## What the checker reports

Errors (the file can't be used): wrong `format` or `version`; missing title, author, versions, ids, sources or
text; duplicate ids; a `recommendation.base` or flag `version` that isn't a version; a flag whose `line` is out
of range or whose `quote` isn't in that line; an unknown flag `kind`; bad dates; sections out of order.

Warnings: versions differ but there's no recommendation; a place where a version differs from the base has no
flag; lines that look like line or page numbers, or HTML; a `url` without a `retrieved` date; unknown fields
(often a misspelling).
