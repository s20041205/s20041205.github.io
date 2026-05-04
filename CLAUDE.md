# CLAUDE.md — 家用記帳 專案交接文件

## 專案概覽

家用記帳 PWA，使用者為 Jerry_Hu 與 Alice_Lin 兩人家庭。
前端純 Vanilla JS，後端為 Google Apps Script + Google Sheets，透過 GitHub Actions 部署。

- **目前版本**：v3.3.0
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

### 年度 sheet（如 `2026`）

Row 11–19，Col B–C：各支出大類年度已使用金額。

```
Row 11: 飲食    Row 12: 衣裝    Row 13: 居住    Row 14: 交通
Row 15: 教育    Row 16: 娛樂    Row 17: 健康    Row 18: 社交
Row 19: 其他
```

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
| Remark | Remark | **標記名稱**（config E 欄下拉） |
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

## 待辦事項（詳見 TODO.md）

1. **後台數據儀表板**：網頁版年度統計 + 標記彙整，新增 `dashboard.html`，密碼存於 `config.js`
2. **Sheets 重整**：複製新試算表取得全新 URL → 更新 GAS 與 GitHub Secrets → 清除 git history 舊 URL
