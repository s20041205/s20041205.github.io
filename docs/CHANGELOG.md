# Changelog

- Oct 28, 2026  **v3.5.1**
    - Chore: project files reorganized — page scripts moved to `js/`, detailed docs moved to `docs/` (`sheets-schema.md`, `frontend.md`, `deployment.md`, `TODO.md`, `CHANGELOG.md`)
    - Docs: README slimmed to an overview; CLAUDE.md rewritten as a handoff index
    - CI: `docs/` excluded from the gh-pages publish

- Oct 27, 2026  **v3.5.0**
    - Feature: recurring expenses page (`recurring.html` / `recurring.js` / `css/recurring.css`) — list, add/edit, enable/disable, manual catch-up run; backend `gas/RecurringExpenses.gs` (daily trigger `processRecurringExpenses`, `recurringExpenses` sheet, `RecurringKey` dedupe column on `active`)
    - Feature: entry form 昨天 / 明天 date shortcut buttons
    - Feature: continuous-entry toggle — after send, keep store/item, clear price/star/tag, refocus price; preference stored in `localStorage`
    - Refactor: GAS backend reorganized into `gas/` (`Common`/`WebApp`/`Records`/`RecurringExpenses`/`Setup.gs` + `gas/README.md`), all hardcoded sheet IDs removed, spreadsheet resolved via Script Property `BOOKKEEPING_SPREADSHEET_ID`
    - Security: formula-injection guard (`sanitizeCell_`) on the write path and `addActivity`
    - Security: all GAS endpoints ignore the client `sheetUrl` and open only the configured spreadsheet; read and write now share a single deployment, all old deployments archived
    - Fix: dashboard re-renders overview / monthly tabs after switching year; budget currency locale `zh-TW` / `TWD`; autocomplete values escaped
    - CI: `gas/` and `CLAUDE.md` excluded from the gh-pages publish

- May 10, 2026  **v3.4.0**
    - Feature: password-protected admin dashboard (`dashboard.html`)
    - Dashboard Tab 1 — yearly income/expense summary cards, monthly trend bar chart, income & expense doughnut charts with subcategory drill-down (click segment or legend text)
    - Dashboard Tab 2 — monthly expense vs. budget bar chart, income doughnut, expense doughnut with drill-down; display order: budget → income → expense
    - Dashboard Tab 3 — tag spend ranking bar chart + summary table; year and person filter
    - Dashboard Tab 4 — recent records with inline edit (all fields) and delete; person filter
    - GAS: `doGet` extended with 5 new action branches (`recentRecords`, `subSummary`, `tagSummary`, `updateRecord`, `deleteRecord`); see `gas/Records.gs`
    - CI: `DASHBOARD_PASSWORD` Actions secret injected into `config.js`

- May 10, 2026  **v3.3.2**
    - Feature: added `住院/療養` to 健康 subcategory (for postpartum care, hospitalization)
    - Feature: added `相片/相冊` to 娛樂 subcategory (for photo printing, ID photos)

- May 07, 2026  **v3.3.1**
    - Fix: renamed form field `Remark` → `Tag` to match intended Sheets column header
    - UX: success/warning toast is now a fixed overlay at the top of the screen — no longer hidden by the mobile keyboard after submission

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
