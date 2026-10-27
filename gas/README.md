# GAS 後端

Google Apps Script Web App，家用記帳 PWA 的後端。前端透過 `config.js` 的
`scriptWriteUrl`（doPost）與 `scriptReadUrl`（doGet）呼叫。

## 檔案

| 檔案 | 內容 |
|------|------|
| `Common.gs` | 共用常數、`getBookkeepingSpreadsheet_()`、`jsonResponse_()`、`sanitizeCell_()`、`parsePositiveInteger_()` |
| `WebApp.gs` | `doGet`（action 分派 + 範圍讀取）、`doPost`（寫入 active + `addActivity`） |
| `Records.gs` | 後台查詢 / 編輯：`recentRecords`、`subSummary`、`tagSummary`、`updateRecord`、`deleteRecord` |
| `RecurringExpenses.gs` | 週期性花費：CRUD action + 每日觸發器 `processRecurringExpenses()` |
| `Setup.gs` | 一次性設定與測試工具（僅編輯器手動執行） |
| `appsscript.json` | manifest（時區 Asia/Taipei、V8、Web App 設定） |

> ⚠️ GAS 全域命名空間共用，檔案切分只是整理用途。頂層（function 外）**絕對不要**使用 `$`。

## 首次部署

1. 建立 Apps Script 專案，貼上 `gas/` 全部 `.gs` 檔與 `appsscript.json`
   （或用 [clasp](https://github.com/google/clasp) `clasp push`）。
2. 於編輯器執行 **`initialSetup()`**（綁定試算表）或
   **`setSpreadsheetId('<試算表ID>')`**（獨立式專案），把試算表 ID 寫入
   Script Property `BOOKKEEPING_SPREADSHEET_ID`。首次執行會跳出授權視窗。
3. 需要週期性花費時，執行 **`setupRecurringExpenses()`**：
   - 建立 `recurringExpenses` 分頁
   - 在 `active` 分頁補上 `RecurringKey` 欄（第 13 欄 / M）
   - 安裝每日 03:15 觸發器 `processRecurringExpenses()`
4. **Deploy → New deployment → Web app**，Execute as = *Me*，Who has access = *Anyone*。
5. 把兩個 `/exec` URL 分別填入 GitHub Secrets `SCRIPT_WRITE_URL`、`SCRIPT_READ_URL`。

## 每次改 `.gs` 後

**Deploy → Manage deployments → 編輯目前部署 → Version: New version → Deploy**。
不重新部署，`/exec` 端點不會更新。

## 端點一覽

### doPost（`scriptWriteUrl`，前端一律 `no-cors`）

| 參數 | 行為 |
|------|------|
| （表單欄位 Date/Balance/…/Name） | 附加一列到 `active`，`Update` 欄填入伺服器時間戳 |
| `action=addActivity` + `name` | 在 `config!E2:E51` 第一個空列寫入標記名稱 |

### doGet（`scriptReadUrl`）

| action | 回傳 | 用途 |
|--------|------|------|
| （無） | 逗號分隔字串 | 範圍讀取（`sheetTag,row,col,endRow,endCol`；`sheetUrl` 忽略） |
| `recentRecords` | JSON array | 後台「近期修改」 |
| `subSummary` | JSON object | 後台支出細項下鑽 |
| `tagSummary` | JSON object | 後台標記彙整 |
| `updateRecord` / `deleteRecord` | `{result}` | 後台行內編輯 / 刪除 |
| `recurringExpenses` | `{items,automationEnabled}` | 週期性花費列表 |
| `saveRecurringExpense` | `{result,id}` | 新增 / 更新訂閱項目 |
| `setRecurringExpenseActive` + `Id,Active` | `{result}` | 啟用 / 停用 |
| `deleteRecurringExpense` + `Id` | `{result}` | 刪除 |
| `runRecurringExpenses` | 統計 | 手動補跑今天以前的週期記帳 |

## 安全備註

- Web App 為 **Anyone (anonymous)**。所有 action（含範圍讀取）一律以
  `getBookkeepingSpreadsheet_()` 開啟 Script Property 指定的試算表，前端傳入的
  `sheetUrl` 參數會被忽略，無法被拿來操作其他試算表。
- 知道 `/exec` 網址的人仍可讀寫**記帳試算表本身**，網址請視同密碼保管。
- `updateRecord` / `deleteRecord` / 週期性花費以 **GET** 觸發寫入，非冪等。維持現狀是為了
  與既有前端一致並避開 GAS 的 CORS 限制。
- **切勿把真實試算表 ID / URL 寫進任何 `.gs`**（本資料夾會進版控並公開部署）。
  ID 一律走 Script Property。
