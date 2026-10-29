# GAS 後端

Google Apps Script Web App，家用記帳 PWA 的後端。前端（`js/api.js`）一律以 GET
呼叫 `config.js` 的 `scriptReadUrl`，並帶上存取碼 `token`。

## 檔案

| 檔案 | 內容 |
|------|------|
| `Common.gs` | 共用常數、`getBookkeepingSpreadsheet_()`、`isAuthorized_()`、`jsonResponse_()`、`sanitizeCell_()`、`parsePositiveInteger_()` |
| `WebApp.gs` | `doGet`（驗證 + action 分派 + 範圍讀取）、`appendRecord_()`、`addActivity_()`、相容用 `doPost` |
| `Records.gs` | 後台查詢 / 編輯：`recentRecords`、`subSummary`、`tagSummary`、`updateRecord`、`deleteRecord` |
| `RecurringExpenses.gs` | 週期性花費：CRUD action + 每日觸發器 `processRecurringExpenses()` |
| `Setup.gs` | 一次性設定與測試工具（僅編輯器手動執行） |
| `appsscript.json` | manifest（時區 Asia/Taipei、V8、Web App 設定） |

> ⚠️ GAS 全域命名空間共用，檔案切分只是整理用途。頂層（function 外）**絕對不要**使用 `$`。

## Script Properties

| Property | 設定方式 | 用途 |
|----------|----------|------|
| `BOOKKEEPING_SPREADSHEET_ID` | `initialSetup()` / `setSpreadsheetId('<ID>')` | 記帳試算表（相容舊的 `key`） |
| `API_TOKEN` | `setApiToken()` / `setApiToken('<自訂>')` | 前端存取碼；未設定時所有請求一律拒絕 |

## 首次部署

1. 建立 Apps Script 專案，貼上 `gas/` 全部 `.gs` 檔與 `appsscript.json`
   （或用 [clasp](https://github.com/google/clasp) `clasp push`）。
2. 於編輯器執行 **`initialSetup()`**（綁定試算表）或
   **`setSpreadsheetId('<試算表ID>')`**（獨立式專案）。首次執行會跳出授權視窗。
3. 執行 **`setApiToken()`**：產生 12 字元隨機存取碼並印在執行紀錄；
   或 `setApiToken('自訂存取碼')`（至少 8 字元）。之後每台裝置第一次開 App 輸入一次。
4. 需要週期性花費時，執行 **`setupRecurringExpenses()`**：
   - 建立 `recurringExpenses` 分頁
   - 在 `active` 分頁補上 `RecurringKey` 欄（第 13 欄 / M）
   - 安裝每日 03:15 觸發器 `processRecurringExpenses()`
5. 執行 **`testRangeRead()`** 確認讀取正常。
6. **Deploy → New deployment → Web app**，Execute as = *Me*，Who has access = *Anyone*。
7. 把 `/exec` URL 填入 GitHub Secret `SCRIPT_READ_URL`。更換部署的完整流程見
   [docs/deployment.md](../docs/deployment.md)。

## 每次改 `.gs` 後

**Deploy → Manage deployments → 編輯目前部署 → Version: New version → Deploy**。
不重新部署，`/exec` 端點不會更新。

## 端點一覽（doGet）

所有請求都必須帶 `token`，錯誤時回 `{result: 'error', error: 'unauthorized'}`。

| action | 參數 | 回傳 | 用途 |
|--------|------|------|------|
| （無） | `sheetTag,row,col,endRow,endCol` | 逗號分隔字串 | 範圍讀取（`sheetUrl` 忽略） |
| `ping` | — | `{result:'ok'}` | 前端驗證存取碼 |
| `addRecord` | 表單欄位 Date/Balance/…/Name | `{result:'success',row}` | 附加一列到 `active`，`Update` 填伺服器時間 |
| `addActivity` | `name` | `{result:'success',row}` | 在 `config!E2:E51` 第一個空列寫入標記 |
| `recentRecords` | `count`（上限 200） | JSON array（含 `rowNum`、`key`） | 後台「近期修改」 |
| `subSummary` | `year`、`name` | JSON object | 後台支出細項下鑽 |
| `tagSummary` | `year`、`name` | JSON object | 後台標記彙整 |
| `updateRecord` | `rowNum`、`key`、欄位 | `{result}` | 後台行內編輯 |
| `deleteRecord` | `rowNum`、`key` | `{result}` | 後台刪除 |
| `recurringExpenses` | — | `{items,automationEnabled}` | 週期性花費列表 |
| `saveRecurringExpense` | 訂閱欄位（`Id` 空為新增） | `{result,id}` | 新增 / 更新訂閱 |
| `setRecurringExpenseActive` | `Id,Active` | `{result}` | 啟用 / 停用 |
| `deleteRecurringExpense` | `Id` | `{result}` | 刪除 |
| `runRecurringExpenses` | — | `{result,posted,skipped,capped}` | 手動補跑今天以前的週期記帳 |

**`key`（記錄指紋）**：`recentRecords` 回傳每列的日期 / 金額 / 店家 / 項目 / 使用者 / 寫入時間組成的指紋。
`updateRecord` / `deleteRecord` 必須帶回，與該列目前內容不符時回 `{error: 'stale'}`
（列號因刪除而位移、或另一台裝置已修改），避免改到或刪到錯的列。

`doPost` 僅為相容保留（同樣需要 `token`），前端已不使用。

## 安全備註

- Web App 為 **Anyone (anonymous)**，靠 `API_TOKEN` 擋外人；`/exec` 網址公開在 `config.js` 中無妨，
  **存取碼不可寫進任何檔案或 git**。
- 所有 action 一律以 `getBookkeepingSpreadsheet_()` 開啟指定試算表，前端傳入的 `sheetUrl` 會被忽略。
- 寫入以 **GET** 觸發，非冪等；這是為了讓前端讀得到回應（GAS 的 POST 回應有 CORS 限制）。
- **切勿把真實試算表 ID / URL 寫進任何 `.gs`**（本資料夾會進版控並公開部署）。
