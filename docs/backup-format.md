# Rhapsode backup format

How to read and edit a Rhapsode backup file, for people and for AI assistants. Any AI that can read and
write files can follow it; nothing here depends on a particular one.

Rhapsode keeps all its data on the device. **Export backup** saves everything to one JSON file, and **Import
backup** merges a file back in. Editing an exported file and importing it is how to make changes outside the
app, such as adding poems or sorting them into folders.

## Workflow

1. In Rhapsode, tap **Export backup**. Keep this file unchanged as the original.
2. Make a copy and edit the copy (or have an AI edit it) following the rules below.
3. Check the edited copy against the original:

   ```sh
   npm run check-backup -- edited.json original.json
   ```

   It reports errors that make the file unsafe to import, lists what importing it will change, and warns
   about edits that import won't carry out.
4. In Rhapsode, tap **Import backup** and pick the edited file. Don't practice between steps 1 and 4: import
   overwrites each poem with the file's copy, so practice records made in between would be lost.

## What import does

- It **adds or overwrites**: a folder or poem whose `id` is already in the app is replaced by the file's copy;
  any other is added.
- It **never deletes**. Removing a poem or folder from the file does nothing; delete it in the app instead.
- It doesn't move practice history when a poem's text changes. History is kept per line number, so editing
  the lines of a poem that has been practiced puts its records on the wrong lines. Edit such poems in the app,
  which moves the history correctly.

## Structure

```json
{
  "version": 1,
  "folders": [{ "id": "mjk2x8a1b2c3", "name": "Lyric" }],
  "poems": [
    {
      "id": "mjk2x9d4e5f6",
      "title": "Kubla Khan",
      "author": "Samuel Taylor Coleridge",
      "lines": ["In Xanadu did Kubla Khan", "A stately pleasure-dome decree:", "…"],
      "breakBefore": [false, false, false],
      "createdAt": "2026-11-19",
      "folderId": "mjk2x8a1b2c3"
    }
  ],
  "lineStats": [],
  "attempts": []
}
```

| Key | Type | Notes |
| --- | --- | --- |
| `version` | number | Always `1`. |
| `folders` | array | Optional; missing in backups made before folders existed. |
| `poems` | array | Required. |
| `lineStats` | array | Required. Per-line practice records, made by the app. |
| `attempts` | array | Required. One record per practice session, made by the app. |

### Folders

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique among folders; never change it. |
| `name` | string | Shown in the folder menu. Rename a folder by changing this. |

### Poems

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique among poems; never change an existing one. |
| `title` | string | Required, not empty. |
| `author` | string | May be `""`. |
| `lines` | string[] | One entry per line to memorize, in order. No empty entries, no line breaks inside one. |
| `breakBefore` | boolean[] | Same length as `lines`. `true` where a stanza break (a blank line) comes before that line. The first entry is `false`. |
| `createdAt` | string | Date added, `YYYY-MM-DD`. |
| `folderId` | string | Optional. The `id` of a folder in `folders`; leave it out for Unfiled. |
| `lastTested`, `lastPassed` | string | Practice records kept by the app. Leave them as exported; leave them out of new poems. |
| `lastFirstPassMisses`, `passStreak` | number | Practice records kept by the app, as above. |

Leave `lineStats` and `attempts` exactly as exported.

## Common edits

**Add a folder.** Append `{ "id": "<new id>", "name": "<name>" }` to `folders`, creating the array if it's
missing.

**Move a poem to a folder.** Set its `folderId` to the folder's `id`. To make it Unfiled, remove `folderId`.

**Add a poem.**

1. Get the text from a reliable source rather than from memory: for memorization, one wrong word matters.
2. Split it into lines. Drop blank lines, and trim spaces from both ends of each remaining line; each becomes
   one entry in `lines`.
3. For each line, set `breakBefore` to `true` if one or more blank lines came before it (not counting blank
   lines at the very start), otherwise `false`.
4. Give it a new unique `id`. Any string not already used works, such as a few words of the title plus
   random letters and digits (`"kubla-khan-x7q2"`).
5. Set `title`, `author` and `createdAt` (today's date), and `folderId` if it goes in a folder.
6. Append it to `poems`. Don't add practice-record fields or `lineStats` or `attempts` entries for it.

For example, this text:

```text
Tyger Tyger, burning bright,
In the forests of the night;

What immortal hand or eye,
```

becomes `"lines": ["Tyger Tyger, burning bright,", "In the forests of the night;", "What immortal hand or
eye,"]` and `"breakBefore": [false, false, true]`.

**Rename a poem or fix its author.** Change `title` or `author`. This is safe even for practiced poems.

**Change a poem's text.** Safe only for a poem that has never been practiced (no `lineStats` or `attempts`
entries with its `id`). Otherwise edit it in the app.

**Delete a poem or folder.** Not possible through import; do it in the app.

## Long poems

Rhapsode works best with poems of about 50 lines or fewer. Until it can split poems into sections itself,
enter a long poem as several poems, each a section that the reader can hold in mind as a unit, titled
for example "Lycidas (1)", "Lycidas (2)".
