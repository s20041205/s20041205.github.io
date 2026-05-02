# Home Sweet Home — Household Bookkeeping

A lightweight household bookkeeping PWA for two users. Entries are submitted to Google Sheets via Google Apps Script, with no server required.

## Features

- Income / expense entry with category hierarchy
- Real-time budget remaining display per expense category
- Tag field (標記) — link entries to a trip, project, or context for cross-category aggregation; add tags directly from the app
- Store / item autocomplete via localStorage
- Star rating for restaurants and stores
- Two-user support
- Offline-capable PWA (manifest, iOS meta tags, SVG icon)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS + custom CSS (no frameworks) |
| Backend | Google Apps Script (GAS) |
| Database | Google Sheets |
| Deployment | GitHub Actions → GitHub Pages |
| Cache | localStorage (autocomplete, max 50 entries each) |

---

## Setup

1. Copy `config.example.js` to `config.js` and fill in your URLs:
   - `scriptWriteUrl` — GAS write endpoint
   - `scriptReadUrl` — GAS read endpoint
   - `sheetUrl` — Google Sheets URL

2. Add the following as GitHub Actions secrets for CI deployment:
   - `SCRIPT_WRITE_URL`
   - `SCRIPT_READ_URL`
   - `SHEET_URL`

---

## Tag Management

Tags are maintained in the Google Sheets **`config` tab, column E** (E1 = header, E2 onwards = tag names).

- **Add a tag from the app**: tap the **＋** button next to the tag dropdown; the app auto-prefixes today's date (`YYMMDD_`)
- **Add a tag in Sheets**: insert a name in the next empty cell in column E
- **Disable a tag**: delete or clear that row in column E
- **Date-prefixed tags** (`YYMMDD_name`) auto-hide from the dropdown 30 days after the event date; unprefixed tags are permanent
- Changes sync to both users on next app refresh
- Maximum 50 entries (E2:E51); increase `activityParams.endRow` in [script.js](script.js) if more are needed

---

## Release History

- May 04, 2026  **v3.3.0**
    - Feature: Tag field (標記) — add tags directly from the app via "＋" button; writes to Google Sheets `config` column E via GAS `action=addActivity`
    - Feature: Date-prefixed tags (`YYMMDD_name`) auto-expire 30 days after event date; unprefixed tags are permanent
    - Category: Removed 育兒 top-level category; child-related tracking now done via 標記 field; 疫苗 moved to 健康, 玩具 moved to 娛樂
    - GAS: `doPost` extended with `action=addActivity` branch to append new tags to `config` sheet column E

- May 03, 2026  **v3.2.1**
    - Security: Google Sheets URL moved to `config.js` (gitignored) and `SHEET_URL` Actions secret
    - CI: deploy.yml uses `printf` + env vars to safely handle URLs containing special characters
    - CI: updated `actions/checkout` to v4.2.2 and `peaceiris/actions-gh-pages` to v4 (Node.js 24 support, required from June 2, 2026)

- May 02, 2026  **v3.2.0**
    - Feature: Remark field replaced with activity dropdown, populated from Google Sheets `config` tab column E
    - Feature: `config` sheet replaces `annualBudget`, consolidating budget and activity list management
    - Security: Google Sheets URL moved out of source code into `config.js` (gitignored) and `SHEET_URL` Actions secret
    - Fix: Budget data now reads from row 2 (skipping header row), resolving NaN display
    - Fix: GAS `doGet` boundary check for `row > lastRow` to prevent CORS exception
    - Fix: PWA meta tag updated from `apple-mobile-web-app-capable` to `mobile-web-app-capable`

- May 02, 2026  **v3.1.1**
    - Category overhaul: added 育兒 top-level category with 10 subcategories
    - Revised subclass items across 飲食, 衣裝, 居住, 娛樂, 健康, 社交
    - Removed jQuery and Bootstrap dependencies (replaced with native fetch and custom CSS)
    - CI/CD: GitHub Actions deployment with secret-based config.js generation
    - Security: rotated GAS endpoints; config.js excluded from git history
    - UX: star rating first option now shows "-"
    - UX: topclass/subclass dropdowns hidden until relevant balance is selected
    - UX: required indicator added to store/item field
    - Fix: iOS date input appearance
    - Refactored all inline scripts to `script.js`
    - Error handling: `alert()` replaced with in-page alerts; `no-cors` mode to fix CORS false-failure
    - UX: keep category selection after send; auto-focus price field for consecutive entry
    - UX: budget loading indicator and error state
    - UX: store/detail autocomplete via localStorage; clear history link
    - UI: card layout, Noto Sans TC, field labels, radio pill selectors
    - Mobile: price field `inputmode="decimal"`
    - PWA: `manifest.json`, SVG icon, iOS meta tags, favicon
    - Fix: date timezone bug (local date instead of UTC)
    - Fix: Reset restores today's date and resets all fields correctly
    - Cleanup: removed DataTables, duplicate Bootstrap import, `projects/` folder

- Jan 19, 2025  **v2.3.0**
    - Items added

- Mar 15, 2023  **v2.2.5**
    - Budget retrieve column bug fixed

- Mar 13, 2023  **v2.2.4**
    - Restaurant recommendations (star rating 0–5)
    - Store column added
    - Layout adjustments

- Dec 11, 2022  **v2.2.3**
    - Month field added

- Dec 10, 2022  **v2.2.2**
    - Budgets displayed in currency format

- Dec 10, 2022  **v2.2.1**
    - Budget display when income items selected bug fixed

- Dec 10, 2022  **v2.2.0**
    - Pull and display latest budgets for each category

- Dec 03, 2022  **v2.1.4**
    - Income and entertainment items added

- Aug 13, 2022  **v2.1.3**
    - Detail hint description updated
    - New category items added

- Feb 10, 2022  **v2.1.2**
    - Required field hints added

- Feb 10, 2022  **v2.1.1**
    - Radio buttons added for user selection
    - Remark field added

- Jan 09, 2022  **v2.1.0**
    - Functions added and document formatted

- Jan 06, 2022  **v2.0.9**
    - Reset button function updated

- Jan 06, 2022  **v2.0.8**
    - Food initial selection bug fixed
    - Reset button added
    - Responsive layout for mobile

---

## TODO

- **Analytics dashboard**: Password-protected web dashboard for yearly statistics and tag summaries
- **Sheets migration**: Copy spreadsheet to get a new URL, update GAS and GitHub Secrets, clean git history

See [TODO.md](TODO.md) for details.
