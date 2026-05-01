# 家用記帳

A lightweight household bookkeeping PWA that submits entries to Google Sheets via Google Apps Script.

## Setup

1. Copy `config.example.js` to `config.js` and fill in your GAS endpoints.
2. Set `SCRIPT_WRITE_URL` and `SCRIPT_READ_URL` as GitHub Actions secrets for CI deployment.

---

## Release History

- May 02, 2026  **v3.1.1**
    - Category overhaul: added 育兒 top-level category with 10 subcategories
    - Revised subclass items across 飲食, 衣裝, 居住, 娛樂, 健康, 社交
    - Removed jQuery and Bootstrap dependencies (replaced with native fetch and custom CSS)
    - CI/CD: GitHub Actions deployment with secret-based config.js generation
    - Security: rotated GAS endpoints; config.js excluded from git history
    - UX: star rating first option now shows ""-""
    - UX: topclass/subclass dropdowns hidden until relevant balance is selected
    - UX: required indicator added to 店家/項目 field
    - Fix: iOS date input appearance
    - Refactored all inline scripts to `script.js`
    - Security: GAS endpoints moved to gitignored `config.js`; `config.example.js` added
    - Error handling: `alert()` replaced with in-page alerts; `no-cors` mode to fix CORS false-failure; submit button disabled during request
    - UX: keep category selection after send; auto-focus price field for consecutive entry
    - UX: budget loading indicator and error state
    - UX: Store/Detail autocomplete via `localStorage`; clear history link
    - UI: card layout, Noto Sans TC, field labels, radio pill selectors
    - Mobile: price field `inputmode="decimal"`
    - PWA: `manifest.json`, SVG app icon, iOS meta tags, favicon
    - Fix: date timezone bug (local date instead of UTC)
    - Fix: Reset restores today's date; balance-list and month field reset correctly
    - Cleanup: removed DataTables, duplicate Bootstrap import, `projects/` folder
    
- Jan 19, 2025 **v2.3.0**
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

- Activity tag feature: tag entries with a trip or event name to aggregate cross-category spending (see [TODO.md](TODO.md))
