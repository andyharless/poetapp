# Changelog

Changes to Rhapsode that users can see, newest first. The git history has the details.

## 2026-09-27

- **Practice missed lines** now asks every line missed on the most recent whole-poem run-through. Drilling
  those lines doesn't change the set; only the next whole-poem run-through does.
- A third option, **Practice lines missed on their last try**, asks only the lines you haven't got right
  since. It appears when that set differs from the run-through set.

## 2026-09-26

- Renamed the app from Poet to **Rhapsode**. Existing data is kept. To update the name under the Home Screen
  icon, export a backup and add the app to the Home Screen again.
- Each line is cued by up to **four** preceding lines instead of two, with stanza breaks shown.
- Poems can be **edited** after they are added. Practice history stays with lines that are unchanged or edited
  in place.
- **Practice missed lines** asks only the lines missed on their last try.
- The poem list can be sorted by **least recently passed**. A pass is a whole run-through with no misses. The
  last passed date is filled in from earlier practice history.
- The poem page shows the last passed date and marks the lines missed on their last try.
- The README was rewritten for readers on GitHub.

## 2026-09-20

- First version (as "Poet"): add poems by pasting or from a `.txt` file, practice line by line with a
  two-line cue, review missed lines until each is right, per-line miss history, last-tested date and
  first-run-through misses, sort by title or least recently tested, and JSON backup. Published to GitHub
  Pages as an installable web app.
