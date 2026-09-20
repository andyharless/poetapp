# Poet

Line-by-line poetry memorization, as an installable web app (PWA). Everything is stored on the device (IndexedDB).

## Develop (Linux)

```sh
# Node is installed via nvm; in a new shell it is on PATH automatically.
npm install
npm run dev        # http://localhost:5173 (also reachable from your phone on the same Wi-Fi)
npm test           # unit tests for the parser and the practice-session logic
npm run build      # production build into dist/
```

Code map: `src/session.ts` (practice logic, no DOM), `src/parse.ts` (text to lines), `src/db.ts` (storage),
`src/screens/*` (the four screens), `src/main.ts` (router).

## Put it on your iPhone

1. Create a GitHub repository, make this `app/` folder its root, and push to the `main` branch.
2. In the repo: Settings > Pages > Source: **GitHub Actions**. The workflow in `.github/workflows/deploy.yml`
   tests, builds and publishes on every push. The URL will be `https://<user>.github.io/<repo>/`.
3. On the iPhone, open that URL in **Safari** > Share > **Add to Home Screen**. It then launches full-screen and works offline.
4. Use **Export backup** on the poem list now and then. Data lives only on the phone, and iOS can clear
   web-app storage (for example if you delete the Home Screen icon).

## Later: real app in TestFlight

Needs the Apple Developer Program ($99/yr). Wrap this build with Capacitor, build the signed `.ipa` in a cloud
Mac (Expo EAS, Codemagic or GitHub Actions macOS runners), upload it to App Store Connect, and it appears in
the TestFlight app. TestFlight builds expire after 90 days.
