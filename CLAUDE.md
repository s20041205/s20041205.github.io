# CLAUDE.md — 家用記帳 專案交接文件

## 專案概覽

家用記帳 PWA，使用者為 Jerry_Hu 與 Alice_Lin 兩人家庭。
前端純 Vanilla JS，後端為 Google Apps Script + Google Sheets，透過 GitHub Actions 部署。

- **目前版本**：v3.4.0
- **Sheets URL**：存於 `config.js`（gitignored），不在原始碼中

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | Vanilla JS + 自製 CSS（無框架） |
| 後端 | Google Apps Script（GAS） |
| 資料庫 | Google Sheets |
| 部署 | GitHub Actions（main 分支推送自動部署至 gh-pages） |
| 快取 | localStorage（Store / Detail 自動完成，最多各 50 筆） |

### 敏感設定（gitignored）

`config.js` 包含以下三個欄位，部署時由 GitHub Actions Secrets 自動產生：

| 欄位 | Secret 名稱 | 說明 |
|------|------------|------|
| `scriptWriteUrl` | `SCRIPT_WRITE_URL` | GAS 寫入端點 |
| `scriptReadUrl` | `SCRIPT_READ_URL` | GAS 讀取端點 |
| `sheetUrl` | `SHEET_URL` | Google Sheets 完整 URL |
| `dashboardPassword` | `DASHBOARD_PASSWORD` | 後台儀表板登入密碼 |

---

## Google Sheets 結構

### `config` 分頁（原 `annualBudget`，v3.2.0 重新命名）

| 欄 | 列 | 內容 |
|----|----|------|
| A–C | 1 | 標題列（項目 / 預算 / 比例） |
| A–B | 2–10 | 9 個支出大類預算 |
| A–C | 13 | Total 合計 |
| E | 1 | 標記清單標題 |
| E | 2–51 | 標記名稱（最多 50 筆） |

支出大類順序（對應 `topclass[2]` index，必須與年度 sheet 一致）：

```
index 0: 飲食   1: 衣裝   2: 居住   3: 交通   4: 教育
index 5: 娛樂   6: 健康   7: 社交   8: 其他
```

### `active` 分頁（記帳資料主表）

GAS `doPost` 寫入目標，依 header 欄位名稱對應 `e.parameter`。

| Col | 欄位名稱 | 說明 |
|-----|---------|------|
| A | Date | 日期（YYYY-MM-DD） |
| B | Month | 月份數字（從 Date 計算） |
| C | Balance | 收入 / 支出 |
| D | Topclass | 大類 |
| E | Subclass | 小類 |
| F | Price | 金額 |
| G | Store | 店家 |
| H | Detail | 項目 |
| I | Recommendation | 推薦星評 |
| J | Name | 使用者（Jerry_Hu / Alice_Lin） |
| K | Update | 寫入時間戳（GAS 自動填入） |
| L | Tag | 標記名稱（config E 欄下拉） |

### 年度統計 sheet（如 `2026`）

每年一個分頁，為彙整統計用途（非原始記帳資料）。**新增年度方法：複製前一年分頁，修改 E2 日期的年份即可。**

#### 列結構

| Row | 內容 |
|-----|------|
| 1 | 備註列（忽略） |
| 2 | 月份標題（E2 起，每月佔 2 欄：金額 + 百分比） |
| 3–10 | 收入各細項（薪資、利息、獎金、投資、販賣、租金、還款、其他） |
| 11–19 | 支出各細項（飲食、衣裝、居住、交通、教育、娛樂、健康、社交、其他） |
| 20 | **（空白分隔列）** |
| 21 | 收入 Total |
| 22 | 支出 Total |
| 23 | 淨利 |

> ⚠️ Row 20 為空白分隔列（非原始文件記載，實際觀測確認）。複製年度分頁時必須保留此空白列，
> 否則儀表板 Total 抓取 index 會錯位。

#### 欄結構

| Col | 內容 |
|-----|------|
| A | 收入 / 支出（僅各區段第一列有值） |
| B | 細項名稱 |
| C | 年度累計金額 |
| D | 年度佔比 % |
| E–F | 1 月（金額 + %） |
| G–H | 2 月（金額 + %） |
| I–J | 3 月（金額 + %） |
| … | 依此類推，每月 2 欄，共 12 個月 |

> `scriptReadUrl` 目前讀取 Row 11–19，Col B–C 作為「年度已使用金額」供首頁預算顯示。
> 儀表板讀取 Row 3–23，Col B–27（26 欄），回傳 21 列資料，0-indexed 對應：
> - index 0–7：收入細項；8–16：支出細項；17：空白；18：收入 Total；19：支出 Total；20：淨利

> ⚠️ v3.3.0 移除「育兒」大類（改用標記欄位跨類追蹤），類別從 10 個減為 9 個。疫苗移入健康，玩具移入娛樂。

---

## script.js 關鍵 fetch 參數

```js
// 預算（config 分頁，跳過標題列）
const budgets      = { sheetUrl: APP_CONFIG.sheetUrl, sheetTag: 'config',                    row: 2,  col: 1, endRow: 10, endCol: 2 };
// 年度已使用金額（當年度 sheet）
const nowusing     = { sheetUrl: APP_CONFIG.sheetUrl, sheetTag: new Date().getFullYear(),     row: 11, col: 2, endRow: 19, endCol: 3 };
// 標記清單（config 分頁 E 欄）
const activityParams = { sheetUrl: APP_CONFIG.sheetUrl, sheetTag: 'config',                  row: 2,  col: 5, endRow: 51, endCol: 5 };
```

> ⚠️ 三個 fetch 物件都必須帶 `sheetUrl`（`APP_CONFIG.sheetUrl`）。
> 若缺少，GAS `openByUrl(undefined)` 拋例外 → CORS 錯誤（HTTP 200 無 CORS header）。

---

## GAS 函式說明

### `doGet(e)`（scriptReadUrl）

讀取任意 sheet 指定範圍，回傳逗號分隔字串。

**已套用修正**（`row > lastRow` 邊界處理）：
```js
if (row > lastRow || col > lastCol) {
    return ContentService.createTextOutput('');
}
rowRange = Math.min(rowRange, lastRow - row + 1);
colRange = Math.min(colRange, lastCol - col + 1);
```

### `doPost(e)`（scriptWriteUrl）— `AddValues.gs`

前端一律以 `no-cors` 模式送出，`.then()` 不論成功失敗都會觸發，無法讀取 GAS 回應屬正常行為。

**分支一：寫入記帳資料**（預設，無 `action` 參數）

寫入 `active` sheet，依 header 欄位名稱對應 `e.parameter`。

**分支二：新增標記**（`action=addActivity`，v3.3.0）

```js
if (e.parameter.action === 'addActivity') {
    var configSheet = doc.getSheetByName('config')
    var eRange = configSheet.getRange('E2:E51').getValues()
    var insertRow = -1
    for (var i = 0; i < eRange.length; i++) {
        if (!eRange[i][0]) { insertRow = i + 2; break }
    }
    if (insertRow !== -1) {
        configSheet.getRange(insertRow, 5).setValue(e.parameter.name)
    }
    return ContentService
        .createTextOutput(JSON.stringify({ 'result': 'success' }))
        .setMimeType(ContentService.MimeType.JSON)
}
```

> ⚠️ GAS 修改後須重新部署（Deploy → Manage deployments → New version），否則 endpoint 不更新。
> ⚠️ `GetRecentValue.gs` 若在頂層（function 外）使用 `$`，會導致整個 GAS 專案崩潰，所有函式都無法執行。

---

## 表單欄位對應（HTML → Sheets）

| HTML name | Sheets 欄位 | 說明 |
|-----------|------------|------|
| Month | Month | 自動從 Date 計算（hidden） |
| Date | Date | 日期 |
| Balance | Balance | 收入 / 支出 |
| Topclass | Topclass | 大類 |
| Subclass | Subclass | 小類 |
| Price | Price | 金額 |
| Store | Store | 店家 |
| Detail | Detail | 項目 |
| Recommendation | Recommendation | 推薦星評 |
| Tag | Tag | **標記名稱**（config E 欄下拉） |
| Name | Name | 使用者（Jerry_Hu / Alice_Lin） |

---

## 標記清單管理

- 維護於 `config` 分頁 E 欄（E1 標題，E2 起為標記名稱）
- 格式：`YYMMDD_名稱`（有時效性）或直接輸入名稱（永久不過期）
- 有前綴的標記：事件日期超過 `ACTIVITY_EXPIRE_DAYS` 天後自動從下拉隱藏（`script.js` 頂部常數，預設 30）
- 新增：App 內「＋」按鈕（自動填入今日 `YYMMDD_` 前綴）或直接編輯 Sheets E 欄
- 停用：刪除或清空 Sheets 該列
- 上限 50 筆（E2:E51）；需要更多請調高 `activityParams.endRow`
- Sheets 編輯後，兩位使用者重新整理 App 即同步

### 標記設計意圖

標記作為**跨大類的情境標籤**（例如：育兒、旅行、裝潢），取代原本獨立的「育兒」大類。
例如兒科疫苗可記為：健康 > 疫苗 + 標記: `育兒`，使健康類別統計涵蓋所有醫療支出。

---

---

## 後台儀表板（dashboard.html）

### 認證

密碼驗證於前端完成，通過後狀態存於 `sessionStorage`（`dash_auth=1`）。
密碼由 `config.js` 的 `dashboardPassword` 欄位提供，對應 Actions Secret `DASHBOARD_PASSWORD`。

### 檔案

| 檔案 | 說明 |
|------|------|
| `dashboard.html` | 後台入口，含登入畫面與四個 Tab 結構 |
| `dashboard.js` | 所有儀表板邏輯（Chart.js 4.x） |
| `css/dashboard.css` | 後台樣式（沿用 `style.css` CSS 變數） |
| `GAS_doGet_additions.js` | 完整 doGet（含新增 action），貼入 GAS 取代原函式 |

### Tab 結構

| Tab | 內容 |
|-----|------|
| 年度總覽 | 年度收支卡片、月份趨勢長條圖、收入圓餅圖、支出圓餅圖（點擊扇形或圖例文字可展開細項下鑽） |
| 月份詳細 | 支出對比預算橫條圖、收入圓餅圖、支出圓餅圖（含細項下鑽）；月份前後切換 |
| 標記彙整 | 標記金額排行橫條圖 + 彙整表格；支援本年 / 全部年份、個人篩選 |
| 近期修改 | 最近 N 筆記錄，支援行內編輯（所有欄位）與刪除；個人篩選 |

### 關鍵常數（dashboard.js）

```js
const INCOME_ROWS       = 8;    // 年度 sheet 收入列數（yearData index 0–7）
const EXPENSE_ROWS      = 9;    // 年度 sheet 支出列數（yearData index 8–16）
const IDX_INCOME_TOTAL  = 18;   // Sheets Row 21 → yearData[18]
const IDX_EXPENSE_TOTAL = 19;   // Sheets Row 22 → yearData[19]
const IDX_NET           = 20;   // Sheets Row 23 → yearData[20]
```

### dashboard.js 主要 fetch 範圍

```js
// 年度統計（年度 sheet，回傳 21 rows × 26 cols）
fetchSheet({ sheetTag: currentYear, row: 3, col: 2, endRow: 23, endCol: 27 })

// 預算（config 分頁 A–B 欄）
fetchSheet({ sheetTag: 'config', row: 2, col: 1, endRow: 10, endCol: 2 })

// 標記清單（config 分頁 E 欄）
fetchSheet({ sheetTag: 'config', row: 2, col: 5, endRow: 51, endCol: 5 })
```

### GAS doGet 新增 actions（使用 scriptReadUrl）

| action | 說明 | 回傳格式 |
|--------|------|---------|
| `recentRecords` | `active` sheet 最後 N 筆，倒序 | `[{rowNum, date, balance, topclass, subclass, price, store, detail, recommendation, name, tag}]` |
| `subSummary` | 支出細項彙整（year + name 可選篩選） | `{topclass: {subclass: {total, monthly[12]}}}` |
| `tagSummary` | 標記彙整（year + name 可選篩選） | `{tag: {total, cats: {topclass: amt}}}` |
| `updateRecord` | 以 rowNum 更新 `active` 指定列 | `{result: 'ok'}` |
| `deleteRecord` | 以 rowNum 刪除 `active` 指定列 | `{result: 'ok'}` |

> ⚠️ GAS 修改後須重新部署（Deploy → Manage deployments → New version）才會生效。

---

## 待辦事項（詳見 TODO.md）

1. **Sheets 重整**：複製新試算表取得全新 URL → 更新 GAS 與 GitHub Secrets → 清除 git history 舊 URL
