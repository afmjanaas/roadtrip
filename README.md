# Gulf Grand Expedition 2026 — Trip Planner

A single-file, self-contained trip planner. No database, no server — everything you change is saved **inside your browser** on the device you use it on.

## Host it on GitHub Pages

1. Create a new repository on github.com (e.g. `gulf-trip`), set it to **Public**.
2. Upload `index.html` to the repository root (Add file → Upload files → Commit).
3. Go to **Settings → Pages**.
4. Under *Build and deployment*: Source = **Deploy from a branch**, Branch = **main**, Folder = **/ (root)** → Save.
5. Wait ~1 minute. Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

## How editing works

Click the **✎ Edit** button in the top bar to switch on edit mode. Then you can:

- **✎ on any day** — edit every detail: route, dates, plans (morning/afternoon/evening/night), tips, weather, road notes, budget figures, and the **hotel** (name, cost, currency).
- **＋ Add place / attraction** — inside any day, add new places with cost, stars, why-visit, Google Maps link, etc. Existing places also get ✎ (edit/delete) buttons.
- **＋ Add a new day** — at the bottom of the itinerary; you choose where it slots in and all days renumber automatically.
- **📷 buttons** — upload your own photo for any attraction, any day (e.g. a route screenshot), or replace the whole route map with your own image. Images are compressed and stored in the browser (IndexedDB), so they survive reloads.
- The budget dashboard, sidebar, and stats all recalculate automatically after any change.

## Where your data lives (important)

- All edits, ticks, and photos are saved in **this browser on this device** (localStorage + IndexedDB). The GitHub copy stays unchanged — it's just the starting template.
- Opening the site on a different device/browser starts from the original plan.
- **Clearing browser data / site data will erase your edits.**

### Moving or backing up your data

- **⤓** (top bar) — downloads a single `trip-backup-YYYY-MM-DD.json` with all your edits, ticks, and photos.
- **⤒** — restores from a backup file on any device. This is how you move your trip between phone ↔ laptop.
- **↺ Reset** (in edit mode, below the itinerary) — wipes everything back to the original plan.

Tip: download a backup every few days while planning.
