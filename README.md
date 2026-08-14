# Routine OS

A personal habit/routine tracker — three files, no build step, no dependencies.

## Run it locally
Just open `index.html` in a browser. That's it.

## Deploy on GitHub Pages (same as Spendly)
1. Create a new repo (or a folder in an existing one) and add these three files: `index.html`, `styles.css`, `app.js`.
2. Push to GitHub.
3. Repo → **Settings → Pages** → Source: `main` branch, `/ (root)` → Save.
4. Your tracker will be live at `https://<username>.github.io/<repo-name>`.

## How your data is stored
Everything lives in your browser's `localStorage` — nothing is sent anywhere. That means:
- Data is per-browser, per-device. It won't sync between your phone and laptop automatically.
- Clearing browser data/cache will wipe it.
- Use **Settings → Export JSON backup** regularly, especially before clearing your browser or switching devices. **Import JSON backup** restores from that file.

## What's editable
- **Schedule blocks** (Settings): times and activities for both College Day and Non-College Day, add/remove blocks freely.
- **Weekly targets**: gym, Gen Alpha, Memestiano, coding, reading, steps, push-ups — all adjustable.
- **Step target**: defaults to 5,000.
- Day type (College / Non-College) can be overridden per day from the dashboard or the Week view — it doesn't just follow a fixed pattern.

## Notes on the scoring system
The consistency score is weighted by category (Health/Fitness 25%, Academics 25%, Coding 15%, Content 15%, Reading 10%, Sleep/routine 10%), not a flat completed/total ratio — so having more habits never drags your score down. A "minimum" completion counts for partial credit (60%), so showing up small still moves the number.
