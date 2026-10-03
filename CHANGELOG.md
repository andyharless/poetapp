# Changelog

Changes to Rhapsode that users can see, newest first. The git history has the details.

Versions are numbered *major.minor.patch*: the middle number goes up for new features, the last for fixes
and small changes. The version is shown at the bottom of the poem list. (Versions before 0.6.1 were numbered
afterwards; those deploys showed a date and commit instead.)

## 0.9.1 — 2026-10-03

- **Sort: author** puts poets known by their first name under that name: Dante Alighieri under D,
  Michelangelo Buonarroti under M, and Leonardo da Vinci under L.

## 0.9.0 — 2026-10-03

- **Sort: author** lists poems by the author's surname, such as Eliot for "T. S. Eliot", then by title.
  A name written "Eliot, T. S." sorts by the part before the comma; "Jr." and the like are skipped, and
  lowercase particles stay with the surname ("de la Mare" sorts under D). Poems with no author come last.

## 0.8.0 — 2026-10-02

- **Folders** divide the poem list into parts. Choose a folder (or **All poems**) above the sort menu;
  **New folder…** creates one, and **Rename** and **Delete** appear while a folder is selected. Deleting a
  folder moves its poems to **Unfiled** and never deletes poems. Pick a poem's folder when adding or editing
  it; a new poem goes into the folder you're viewing. In **All poems**, each poem shows its folder. Backups
  include folders, and older backups still import.

## 0.7.0 — 2026-10-02

- Each poem keeps a **pass streak**: how many whole-poem run-throughs in a row, up to the latest, had no
  misses. The poem list shows it as "passed, 3 in a row" when the last run-through was a pass, and the poem
  page as "3 passes in a row" next to the last passed date. Missed-line drills don't affect it. Streaks for
  existing poems are worked out from their practice history.

## 0.6.2 — 2026-10-01

- The version at the bottom of the poem list includes the date of the release, as in
  "Rhapsode version 0.6.2 · 20261001".

## 0.6.1 — 2026-10-01

- The bottom of the poem list shows a version number, such as "Rhapsode version 0.6.1", instead of a date
  and commit code.

## 0.6.0 — 2026-10-01

- On a computer, **Export backup** saves a file to Downloads instead of opening the system share window.
- Keyboard shortcuts for practice on a computer: **Space** or **Enter** to reveal, **→** or **G** for Got
  it, **←** or **M** for Missed, **Esc** to quit. A hint below the buttons lists them.
- The README explains using the app in a desktop browser.

## 0.5.0 — 2026-10-01

- When a new version has downloaded, a banner says **A new version of Rhapsode is ready** with a **Reload**
  button, instead of the update appearing only on a later launch. The app also checks for updates each time
  you return to it.

## 0.4.1 — 2026-10-01

- Fixed **Export backup** on Android, which still saved a `.json` file to Downloads. It now shares the `.txt`
  version first there, and tries the other kind if one is refused. If sharing fails entirely, it says why
  below the buttons.
- The bottom of the poem list shows which version is running, so you can tell whether a phone has picked up
  the latest update.

## 0.4.0 — 2026-10-01

- On Android, **Export backup** now opens the share sheet (so it can go straight to a cloud storage app)
  instead of only saving to Downloads. The backup is shared as a `.txt` file there, because Chrome on Android
  won't share `.json` files. **Import backup** accepts both `.json` and `.txt` backups.
- The README explains installing on Android and moving backups between phones.

## 0.3.2 — 2026-10-01

- Reworded the third practice option to **Practice lines missed when last tried**, and the matching note
  on the poem page, so "their last try" can't be read as referring to the user.

## 0.3.1 — 2026-10-01

- Each line is now cued by up to **five** preceding lines instead of four, so a four-line refrain doesn't
  leave the cue ambiguous.

## 0.3.0 — 2026-09-27

- **Practice missed lines** now asks every line missed on the most recent whole-poem run-through. Drilling
  those lines doesn't change the set; only the next whole-poem run-through does.
- A third option, **Practice lines missed on their last try**, asks only the lines you haven't got right
  since. It appears when that set differs from the run-through set.

## 0.2.0 — 2026-09-26

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

## 0.1.0 — 2026-09-20

- First version (as "Poet"): add poems by pasting or from a `.txt` file, practice line by line with a
  two-line cue, review missed lines until each is right, per-line miss history, last-tested date and
  first-run-through misses, sort by title or least recently tested, and JSON backup. Published to GitHub
  Pages as an installable web app.
