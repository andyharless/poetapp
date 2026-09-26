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
- **Practice line by line.** The app shows up to four preceding lines (or the title, at the start of the poem)
  as a cue. You recall the next line, tap **Reveal**, and mark it **Got it** or **Missed**.
- **Review what you missed.** After the run-through, the lines you missed are asked again, repeating until
  you have got each one right.
- **Drill just the weak spots.** **Practice missed lines** asks only the lines you missed on their most recent
  try, each with its usual cue. These drills update the lines' history but don't count as a run-through of
  the whole poem.
- **Keep records.** For each poem the app records the last date it was tested, how many lines you missed on the
  first run-through, and the last date you *passed* it (a whole run-through with no misses). For each line
  it counts misses against tests, and it marks the lines you missed on their last try.
- **Choose what to practice.** Sort the list by title, least recently tested, or least recently passed.
- **Back up.** **Export backup** saves everything to a JSON file, and **Import backup** merges one back in.

## Install on a phone

1. On an iPhone, open the link above in **Safari**, then choose Share > **Add to Home Screen**. It launches
   full-screen and works offline.
2. Use **Export backup** now and then. The data lives only on the phone, and iOS can clear web-app storage,
   for example if you delete the Home Screen icon.

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

- Try the web app on Android.
- A real iOS app through TestFlight. This needs the Apple Developer Program ($99/yr): wrap this build with
  Capacitor, build the signed `.ipa` on a cloud Mac (Expo EAS, Codemagic or GitHub Actions macOS runners), and
  upload it to App Store Connect. TestFlight builds expire after 90 days.

The steps used to set up this repo and GitHub Pages the first time are in [docs/setup-notes.md](docs/setup-notes.md).
