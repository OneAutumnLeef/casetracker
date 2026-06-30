# CaseTracker

A shared, no-login workspace for an MBA community to track **case competitions** and **build teams** together. Everyone with the link sees the same data, live.

- **Overview** — every competition as a tile (photo, prize, rounds, team size, deadline). Search + filter by status/theme.
- **Competition page** — drag people into teams, with live diversity bars (M/F · Eng/Non-eng), size-limit enforcement, imbalance warnings, **Auto-balance** and **Shuffle** to form fair random teams, team leads, locking, and **round + registration tracking**. Copy a roster for WhatsApp or export CSV.
- **Community** — your batch, each tagged by gender + engineering background. **Bulk import** by pasting a list.
- **Calendar** — every deadline in one timeline so nothing slips.
- **Member profile** — which team a person is in for *every* competition, with conflict flags.

## Tech
React + Vite · React Router · Firebase Firestore (live sync) · @dnd-kit (drag & drop). Falls back to per-device `localStorage` if Firebase is unreachable (a banner warns when this happens).

## Run locally
```bash
npm install
npm run dev
```

## Firebase setup (required for shared/live data)
1. The project is already wired to a Firebase project via `.env` (`VITE_FIREBASE_*`). To use your own, replace those values from your Firebase project settings.
2. In the [Firebase Console](https://console.firebase.google.com) → **Firestore Database** → create a database (production mode is fine).
3. Go to the **Rules** tab, paste the contents of [`firestore.rules`](firestore.rules), and **Publish**. This allows the no-login read/write the app relies on.
4. First load auto-seeds the starter competitions into the `competitions` collection.

> Without step 3, writes are denied and the app silently drops to local-only mode (you'll see the offline banner) — teams won't be shared.

## Deploy to GitHub Pages
```bash
npm run deploy
```
This builds and publishes `dist/` via `gh-pages`. The app is served under `/casetracker/` (see `base` in `vite.config.js` and `basename` in `src/main.jsx`). `public/404.html` handles deep-link refreshes so URLs like `/casetracker/competition/<id>` work.

If your repo name isn't `casetracker`, update `base` in `vite.config.js` and `basename` in `src/main.jsx` to match.

## Bulk import format
One person per line; gender/background optional after a comma (any order):
```
Priya, female, non-engineering
Arjun, m, eng
Karthik
Meena, f
```
