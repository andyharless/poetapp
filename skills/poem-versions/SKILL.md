---
name: poem-versions
description: Gather several versions of a poem (from the web and/or text files the owner supplies), record where each came from, and write a Rhapsode versions file with guidance on which to choose. Use when asked to find, fetch or compare texts of a poem to add to Rhapsode.
---

# Gathering versions of a poem for Rhapsode

Rhapsode is an app for memorizing poems. For memorization one wrong word matters, and printed texts of the same
poem differ: misprints, OCR errors, the author's revisions, editors' modernized spelling. Your job is to collect
several versions of the poem from cited sources, find where they differ, and say which to choose and why, in a
**versions file** the owner will open in Rhapsode. The owner makes the final choice.

The format is specified in `docs/versions-format.md` in the Rhapsode repository
(<https://github.com/andyharless/poetapp>). Read it before writing a file. These instructions work for any AI
assistant; if you can't use skills, just follow this file.

## Rules

- **Never write a poem's text from memory**, not even a line, not even to fill a gap. Every word of every
  version must come from a source you fetched or a file the owner gave you. If you can't fetch a text, say so.
- Copy text exactly: keep the source's spelling, capitals and punctuation, including old spellings, dashes and
  curly quotes. Don't correct anything in a version's text; put corrections in flags.
- Record each version's source honestly. If you're unsure where a site got its text, say so in `notes`.

## Steps

1. **Pin down the poem.** Title, author, and which poem if the title is ambiguous. Note the folder if the
   owner named one. If the poem has well-known variant forms (a revised version, a different first edition),
   find out which the owner wants, or gather both.

2. **Collect versions.** Aim for two to four that are as independent as possible: different editions rather
   than several websites copying the same text.
   - Good sources: Project Gutenberg and other scans of printed editions (note the edition and editor);
     Wikisource (note the edition it transcribes); the Poetry Foundation; Representative Poetry Online;
     Bartleby; university and library sites; the author's estate or publisher.
   - Avoid: quotation and lyrics sites, blogs, social media, AI-generated pages, and pages with no stated
     source.
   - Files the owner supplies are versions too: use the file name as `source`, and no `url`.
   - For each, record `source` (site and edition), `url`, `published` (year of the text, as precisely as
     known) and `retrieved` (today's date).
   - If you can find only one version, that's fine: write a file with one version and say why in the
     recommendation.

3. **Clean the text.** One line of verse per line; a blank line between stanzas. Remove anything that isn't
   the poem: line numbers (often every 5 or 10 lines), page numbers and running heads, footnote markers,
   editorial notes, HTML. Keep the title out of the text. Rejoin lines a web page or scan wrapped in the
   middle; where you can't tell if a break is the poet's, keep it and flag it as `uncertain`. Drop
   indentation (the app ignores it).

4. **Compare.** Pick a base: usually the most authoritative text (the author's final or best-known version
   from a reliable edition). Compare every other version with it line by line, word by word, and punctuation
   mark by punctuation mark. Do this mechanically (for example with a diff tool) if you can, not by eye.

5. **Give guidance.**
   - `recommendation`: the base, a one- or two-sentence `summary` (which to use and why), and optionally a
     longer `detail` (how the editions relate, what each editor changed).
   - A **flag on every place a version differs** from the base, even when you have no preference: `kind`
     (`likely-error`, `revision`, `editorial` or `uncertain`), a short `note`, `suggest` if it's a
     correction, and `detail` for evidence. A flag's `line` counts the non-blank lines of that version from
     1, and its `quote` must be copied exactly from that line.
   - If the base itself has a likely error, flag it on the base and give the `suggest`ed reading.

6. **Write the file** as `<title>.versions.json` (for example `kubla-khan.versions.json`), UTF-8, following
   `docs/versions-format.md`.

7. **Check it** if you can run Node.js in a copy of the repository:

   ```sh
   npm run check-versions -- kubla-khan.versions.json
   ```

   Fix every error. Fix warnings too: an unflagged difference needs a flag, and a "line of only a number"
   usually means a line number was left in. If you can't run the checker, re-read the file against the
   format: line counts, quotes and ids are the common mistakes.

8. **Report to the owner**: the file, the recommendation, how many places the versions differ, and anything
   you couldn't settle. Rhapsode can't open versions files yet; until it can, also give the recommended text
   (with any corrections the owner accepts) ready to paste into **Add poem**.

## Long poems

Rhapsode works best with sections of about 50 lines or fewer. Don't split the text in the versions file. If
the owner asks for suggested section breaks, add `sections` as described in the format, choosing breaks at
stanza or verse-paragraph ends that make units a reader can hold in mind.
