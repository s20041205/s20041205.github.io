# Home Sweet Home — Household Bookkeeping

A lightweight household bookkeeping PWA for two users. Entries are submitted to Google Sheets via Google Apps Script, with no server required.

## Features

- Income / expense entry with category hierarchy
- Real-time budget remaining display per expense category
- Tag field (標記) — link entries to a trip, project, or context for cross-category aggregation; add tags directly from the app
- Store / item autocomplete via localStorage
- Star rating for restaurants and stores
- Two-user support
- Continuous-entry toggle (keep store/item, refocus price) and 昨天/明天 date shortcuts
- Installable PWA (manifest, iOS meta tags, SVG icon)
- Password-protected admin dashboard (`dashboard.html`) — yearly overview, monthly breakdown, tag summary, and recent-record editing
- Recurring expenses (`recurring.html`) — subscriptions and fixed costs auto-posted each cycle by a daily Apps Script trigger, with add/edit/disable management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS + custom CSS (no frameworks), Chart.js for the dashboard |
| Backend | Google Apps Script (GAS) |
| Database | Google Sheets |
| Deployment | GitHub Actions → GitHub Pages |
| Cache | localStorage (autocomplete, max 50 entries each) |

---

## Project Structure

```
├─ index.html            Entry form (PWA start page)
├─ dashboard.html        Admin dashboard
├─ recurring.html        Recurring-expense management
├─ manifest.json         PWA manifest
├─ config.example.js     Template for config.js (config.js itself is gitignored)
├─ js/                   Page scripts (script.js / dashboard.js / recurring.js)
├─ css/                  Stylesheets (style.css shared; dashboard.css, recurring.css)
├─ icons/                App icon
├─ gas/                  Google Apps Script backend (not published to Pages)
├─ docs/                 Project documentation (not published to Pages)
└─ .github/workflows/    Deploy workflow
```

## Setup

1. Copy `config.example.js` to `config.js` and fill in:
   - `scriptReadUrl` — GAS web app `/exec` URL (serves all reads and writes)
   - `sheetUrl` — Google Sheets URL
2. Add the matching GitHub Actions secrets: `SCRIPT_READ_URL`, `SHEET_URL`.
3. Deploy the backend as described in [gas/README.md](gas/README.md), including `setApiToken()` to create the access code.
   Each device enters the access code once; it is never stored in the repo or `config.js`.
4. Push to `main` — GitHub Actions publishes the site to `gh-pages`.

## Documentation

| Document | Contents |
|----------|----------|
| [docs/sheets-schema.md](docs/sheets-schema.md) | Google Sheets tabs, columns, tag management |
| [docs/frontend.md](docs/frontend.md) | Pages, dashboard tabs, recurring page, PWA notes |
| [docs/deployment.md](docs/deployment.md) | Secrets, deploy flow, branching, release checklist, troubleshooting |
| [gas/README.md](gas/README.md) | Backend files, setup, endpoint reference |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Release history |
| [docs/TODO.md](docs/TODO.md) | Open items and decisions |
