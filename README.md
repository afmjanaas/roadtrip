> **This is the FLAT build** — all files sit in one folder (no subfolders), so you can upload them to GitHub with the normal file picker: Add file → Upload files → *choose your files* → select ALL files at once (Ctrl+A).

# 🧭 Family Trip Planner

A multi-trip family travel planner with a real cloud database — plan itineraries day by day, pick hotels, pin your route on a map, upload photos from any device, track every expense against your budget, and export it all to CSV. English + தமிழ். Free to run.

**What's inside**

- **Multiple trips** — the Gulf Grand Expedition 2026 loads as your first trip with all 18 days, 58 attractions, hotels, checklists, and the Umrah / visa / driving guides (with Tamil).
- **Itinerary** — add/edit/delete days and places, change hotels, day photos, everything recalculates.
- **Route map** — interactive OpenStreetMap: tap to add stops, drag pins, reorder, leg distances, open any leg in Google Maps.
- **Budget** (planned) / **Expenses** (daily entry from your phone) / **Budget vs Actual** (day-by-day and by category, cumulative chart) / **CSV export**.
- **Checklists**, **Guides**, **Settings** (currencies & rates, family access, Tamil mode, dark mode).
- **Syncs live** between laptop and phones via Firestore; works offline and syncs when you're back online.

---

## Setup (once, ~20 minutes)

### 1. Create the Firebase project
1. Go to **console.firebase.google.com** → *Add project* → name it (e.g. `family-trips`) → Analytics off → Create.
2. **Build → Authentication → Get started → Google → Enable** → Save.
3. **Build → Firestore Database → Create database** → *Start in production mode* → pick a close region (e.g. `europe-west` or `asia-south`) → Create.

### 2. Connect the app
1. Project overview → **⚙ Project settings → Your apps → Web (</>)** → register app (no hosting checkbox needed) → copy the `firebaseConfig` object.
2. Open `firebase-config.js` in this folder and paste your values over the `PASTE_ME` placeholders.

### 3. Security rules
1. Firestore → **Rules** tab → replace everything with the contents of `firestore.rules` → **Publish**.
2. These rules mean: the **first Google account to sign in claims the app** as owner; only emails on the allowed list can read/write anything.

### 4. Host it (pick one — all free)
**Firebase Hosting (recommended — same console, fastest):**
```
npm install -g firebase-tools
firebase login
firebase init hosting        # select your project, public dir = . , single-page app = No
firebase deploy
```
Your app: `https://YOUR-PROJECT.web.app`

**GitHub Pages:** create a repo, upload ALL files/folders, Settings → Pages → deploy from branch.
**Also fine:** Netlify / Cloudflare Pages (drag-and-drop the folder).

### 5. Authorize your domain for sign-in
Authentication → **Settings → Authorized domains** → *Add domain* → add where you hosted
(e.g. `your-username.github.io`). `*.web.app` is pre-authorized automatically.

### 6. First run
1. Open the site → **Sign in with Google** → tap **Make me the owner**.
2. Tap **Load the Gulf Expedition 2026 sample trip** → your full trip appears.
3. Settings → **Family access** → add Jafeen's (and other) Google emails, one per line.

---

## Daily use during the trip
- Phone → **Expenses** → amount, category, currency (SAR/AED/QAR — converted automatically) → add. Two taps.
- **Budget vs Actual** shows instantly whether the day is over or under plan.
- After the trip: **Expenses → ⬇ Export CSV** for Excel.

## Notes
- **Photos** are compressed (~1100 px) and stored inside Firestore documents — free, synced, no billing card ever needed. Don't use it as a photo archive; keep originals in Google Photos.
- **Free limits** (Firestore Spark): 50k reads / 20k writes / 1 GiB per day-storage — a family trip uses a tiny fraction.
- **Offline**: pages you've opened keep working without signal; changes queue and sync automatically.
- **Tamil**: அ button in the top bar switches the whole app to bilingual mode.
