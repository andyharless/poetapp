# Rhapsode: notes for Claude

Rhapsode is a poetry-memorization web app (PWA): Vite + vanilla TypeScript, IndexedDB via `idb`,
`vite-plugin-pwa`. Live at https://andyharless.github.io/poetapp/ (repo `andyharless/poetapp`). The owner uses
it as an installed app on an iPhone, an Android phone and desktop Chrome. All data is on the device; there is
no server. README.md describes the features and the code map.

## Commands

```sh
npm install
npm test           # vitest unit tests (tests/)
npm run build      # type-check (tsc --noEmit) + production build into dist/
npm run dev        # dev server on http://localhost:5173
npm run preview    # serve dist/ on http://localhost:4173
```

Run `npm test` and `npm run build` before every commit. For UI changes, also check the built app in a
headless browser when one is available (puppeteer-core driving Chrome against `npm run preview`), at phone
size and at desktop size.

## Every user-visible change

In the same commit:

1. Bump the version with `npm version X.Y.Z --no-git-tag-version`, which updates package.json and
   package-lock.json. Bump the middle number for a new feature and the last number for a fix or small change.
   The first number stays 0 until the owner decides on 1.0. Several commits in one deploy can share a version.
2. Add a section at the top of CHANGELOG.md headed `## X.Y.Z — YYYY-MM-DD`, describing the change from the
   user's point of view.
3. Update README.md if it describes the behavior that changed.

The poem list footer shows "Rhapsode version X.Y.Z · YYYYMMDD": the package.json version and the date of the
built commit (see vite.config.ts).

Commit messages: a short summary line, then a paragraph explaining what changed and why.

## Deploying

Every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages
in about a minute. Pushing to `main` changes the live app on the owner's phones, so ask before pushing
unless told to push. In a cloud session, work on a branch and open a pull request; the owner merges it to
deploy. If a deploy fails, re-run only the failed job, never "re-run all jobs", which caused a "Multiple
artifacts" error once.

Phones pick up a deploy through the service worker in prompt mode (src/update.ts): a banner offers Reload,
and otherwise the new version loads on the next full relaunch.

## Don't break existing data

- The IndexedDB database is named `poetapp` (the app's old name) and is at version 3. Never rename it. To
  change the schema, bump the version and migrate in the `upgrade` callback in src/db.ts.
- Backups are JSON with `version: 1`. Keep importing old backups working; add fields as optional.
- Per-line history is keyed by line index. When poem text is edited, src/remap.ts moves history to the
  right lines.

## Conventions

- UI text addresses the user in the second person and avoids wording that could be read as referring to
  the user when it means a line (for example, "missed when last tried", not "missed on their last try").
- Keep UI text short; the app is mostly used on a phone.
- Desktop-only touches (download instead of share, keyboard hints) use `isTouchDevice()` in src/dom.ts.
- Chrome on Android won't share `.json` files, so backups are shared as `.txt` there (src/screens/list.ts).

## Ideas not yet built

From the owner's original notes: memorization phases per poem, splitting long poems into sections of about
50 lines, comparing published versions of a poem, typed recall with a diff against the text, syncing between
devices, and possibly a native iOS app later (Capacitor + TestFlight).
