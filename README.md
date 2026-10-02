# Rhapsode

A small web app for memorizing poetry line by line and keeping memorized poems fresh. (In ancient Greece,
a *rhapsode* was a professional reciter of epic poetry, performing Homer from memory.)

**Use it:** <https://andyharless.github.io/poetapp/>

It runs in the browser and can be installed on a phone's home screen as a web app (PWA). It works offline,
and there is no account or server: your poems and practice history are stored only on your device.

## How it works

- **Add poems or fragments.** Paste the text or load a `.txt` file. Each line of text is one line to memorize,
  and blank lines mark stanza breaks. Any script works, including Ancient Greek, Cyrillic and right-to-left
  text such as Hebrew. You can edit a poem later. Practice history stays with lines that are unchanged or
  edited in place, such as a typo fix.
- **Practice line by line.** The app shows up to five preceding lines (or the title, at the start of the poem)
  as a cue. You recall the next line, tap **Reveal**, and mark it **Got it** or **Missed**.
- **Review what you missed.** After the run-through, the lines you missed are asked again, repeating until
  you have got each one right.
- **Drill just the weak spots.** Besides the whole poem, you can practice only the lines missed on the last
  whole-poem run-through, or only the lines missed when last tried (which differs once you have
  drilled some of them). Each line keeps its usual cue. Drills update the lines' history but don't count as a
  run-through of the whole poem.
- **Keep records.** For each poem the app records the last date it was tested, how many lines you missed on the
  first run-through, the last date you *passed* it (a whole run-through with no misses), and how many times in a
  row you have passed it. For each line it counts misses against tests, and it marks the lines missed when
  last tried.
- **Organize long lists.** Put poems in folders, such as "Greek" or "Learning", and view one folder at a time
  or all poems together. Each poem is in at most one folder; poems in none are listed as Unfiled.
- **Choose what to practice.** Sort the list by title, least recently tested, or least recently passed.
- **Back up.** **Export backup** saves everything to a JSON file, and **Import backup** merges one back in.

## Install

- **iPhone:** open the link above in **Safari**, then choose Share > **Add to Home Screen**.
- **Android:** open the link in **Chrome**, then tap **Install** when offered, or use the ⋮ menu >
  **Add to Home screen**.

Either way it launches full-screen and works offline. Use **Export backup** now and then: the data lives only
on the phone, and the phone can clear web-app storage, for example if you delete the Home Screen icon.

### Using it on a computer

Open the link in a desktop browser such as Chrome; your data is kept between visits. To give it its own
window and launcher entry, click the install icon at the right of Chrome's address bar, or use ⋮ > **Cast,
save and share** > **Install page as app**. The installed app and the browser tab share the same data.

- Data is kept per browser and per browser profile, so Chrome and Firefox on the same computer each have
  their own. Clearing the browser's site data deletes it, and an Incognito window forgets it when closed.
- **Export backup** saves a file to your Downloads folder (on phones and tablets it opens the share sheet).
- In practice, keyboard shortcuts work: **Space** or **Enter** reveals the line, **→** or **G** is Got it,
  **←** or **M** is Missed, and **Esc** quits.

### Moving data between devices

Poems aren't synced between devices. To copy them, **Export backup** on one device and **Import backup** on
the other; importing merges into what is already there.

- **Export** on a phone opens the share sheet, so you can send the backup straight to a cloud storage app.
  On Android the file is named `.txt` instead of `.json`, because Chrome on Android won't share `.json`
  files. The contents are the same, and either kind can be imported.
- **Import on an iPhone:** the file picker opens at iCloud Drive. To use another storage app, tap **Browse**,
  then pick it under **Locations**. If it isn't listed, tap ⋯ > **Edit** there and turn it on. The app must
  support the Files app for this to work.

## Develop

Requires Node.js (the deploy workflow uses Node 24).

```sh
npm install
npm run dev        # http://localhost:5173 (also reachable from a phone on the same Wi-Fi)
npm test           # unit tests for the parser, edit remapping and practice-session logic
npm run build      # production build into dist/
```

Every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes the site to
GitHub Pages.

Built with Vite, TypeScript (no framework), IndexedDB via `idb`, and `vite-plugin-pwa`. Code map:

| Path | What it holds |
| --- | --- |
| `src/session.ts` | Practice logic: run-through, review queue, cues, results (no DOM) |
| `src/remap.ts` | Moves per-line history to the right lines after an edit |
| `src/parse.ts` | Converts pasted text to lines and stanza breaks, and back |
| `src/db.ts` | Storage and backup |
| `src/screens/*` | The screens: list, add/edit, poem detail, practice |
| `src/main.ts` | Hash router |

## Later

- A real iOS app through TestFlight. This needs the Apple Developer Program ($99/yr): wrap this build with
  Capacitor, build the signed `.ipa` on a cloud Mac (Expo EAS, Codemagic or GitHub Actions macOS runners), and
  upload it to App Store Connect. TestFlight builds expire after 90 days.

What changed and when is in [CHANGELOG.md](CHANGELOG.md). The steps used to set up this repo and GitHub Pages the first time are in [docs/setup-notes.md](docs/setup-notes.md).
