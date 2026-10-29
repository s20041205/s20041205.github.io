# CLAUDE.md — 家用記帳 專案交接文件

家用記帳 PWA，使用者為 Jerry_Hu 與 Alice_Lin 兩人家庭。
前端 Vanilla JS（GitHub Pages），後端 Google Apps Script + Google Sheets。

- **目前版本**：v3.6.0
- **開發分支**：`Claude` → PR → `main`（push `main` 自動部署）

---

## 文件索引

| 要找什麼 | 看哪裡 |
|----------|--------|
| Sheets 分頁 / 欄位 / 列結構、標記規則、前端讀取範圍 | [docs/sheets-schema.md](docs/sheets-schema.md) |
| 三個頁面的功能、認證、PWA | [docs/frontend.md](docs/frontend.md) |
| Secrets、部署流程、分支、發版、疑難排解 | [docs/deployment.md](docs/deployment.md) |
| GAS 檔案、首次設定、端點一覽 | [gas/README.md](gas/README.md) |
| 版本紀錄 | [docs/CHANGELOG.md](docs/CHANGELOG.md) |
| 待辦與已決定不做的事 | [docs/TODO.md](docs/TODO.md) |

## 檔案分類

| 位置 | 內容 | 發布到 Pages |
|------|------|:---:|
| 根目錄 `*.html` | 頁面入口（網址固定，勿搬移） | ✅ |
| `js/` | `api.js`（共用 GAS client + 存取碼）、各頁 JS（`script.js` / `dashboard.js` / `recurring.js`） | ✅ |
| `css/` | `style.css`（共用變數）、`dashboard.css`、`recurring.css` | ✅ |
| `icons/`、`manifest.json` | PWA | ✅ |
| `config.js` | 敏感設定（gitignored，CI 由 Secrets 產生） | ✅ |
| `gas/` | GAS 原始碼；`gas/gas_backup/` 為 Google 上舊版快照（gitignored） | ❌ |
| `docs/` | 專案文件 | ❌ |
| `README.md`、`CLAUDE.md` | 概覽 / 交接 | ❌ |

---

## 必須記住的限制

- **類別清單有四份**：`js/script.js`、`js/dashboard.js`、`js/recurring.js`、
  `gas/RecurringExpenses.gs`（`RECURRING_SUBCLASSES_`），改類別時全部同步。
  支出大類順序須與 `config` A2:A10、年度分頁 Row 11–19 一致。
- **年度分頁 Row 20 是空白分隔列**，儀表板 index 依賴它。
- **GAS 不信任前端 `sheetUrl`**，一律用 `getBookkeepingSpreadsheet_()`（Script Property
  `BOOKKEEPING_SPREADSHEET_ID`）。**任何 `.gs` 不得寫入真實試算表 ID / URL。**
- **GAS 改動後必須部署 New version**；只維持一個部署，讀寫共用同一個 `/exec`。
- GAS 頂層（function 外）不可使用 `$`。
- **所有 GAS 請求都要帶存取碼 `token`**（Script Property `API_TOKEN`）。前端一律經 `js/api.js`
  以 GET 呼叫，才讀得到回應；新增 action 時不要繞過 `Api`。存取碼不可寫進任何檔案。
- 後台編輯 / 刪除以 `rowNum` + `key`（記錄指紋）定位，不可只靠列號。
- `config.js`、`gas/gas_backup/` 含真實網址 / ID，**不可 commit**。

## 慣例

- Commit：`[Type]: summary`（`Feat` / `Fix` / `Refactor` / `Security` / `Docs` / `Chore`）
- 發版：`index.html` 版本號 + `docs/CHANGELOG.md` + 本檔「目前版本」
- PR 合併用 merge commit，不用 squash（原因見 docs/deployment.md）
