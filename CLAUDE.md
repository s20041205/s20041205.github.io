# CLAUDE.md — 家用記帳 專案交接文件

## 專案概覽

家用記帳 PWA，使用者為 Jerry_Hu 與 Alice_Lin 兩人家庭。
前端純 Vanilla JS，後端為 Google Apps Script + Google Sheets，透過 GitHub Actions 部署。

- **目前版本**：v3.2.1
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
| A–B | 2–11 | 10 個支出大類預算 |
| A–C | 13 | Total 合計 |
| E | 1 | 活動清單標題 |
| E | 2–51 | 活動名稱（最多 50 筆） |

支出大類順序（對應 `topclass[2]` index，必須與年度 sheet 一致）：

```
index 0: 飲食   1: 衣裝   2: 居住   3: 交通   4: 教育
index 5: 娛樂   6: 健康   7: 社交   8: 育兒   9: 其他
```

### 年度 sheet（如 `2026`）

Row 11–20，Col B–C：各支出大類年度已使用金額。

```
Row 11: 飲食    Row 12: 衣裝    Row 13: 居住    Row 14: 交通
Row 15: 教育    Row 16: 娛樂    Row 17: 健康    Row 18: 社交
Row 19: 育兒    Row 20: 其他
```

> ⚠️ v3.1.1 新增「育兒」（index 8），年度 sheet 需在 row 19 插入育兒統計列，否則已使用金額會錯位。

---

## script.js 關鍵 fetch 參數

```js
// 預算（config 分頁，跳過標題列）
const budgets      = { sheetUrl: APP_CONFIG.sheetUrl, sheetTag: 'config',                    row: 2,  col: 1, endRow: 11, endCol: 2 };
// 年度已使用金額（當年度 sheet）
const nowusing     = { sheetUrl: APP_CONFIG.sheetUrl, sheetTag: new Date().getFullYear(),     row: 11, col: 2, endRow: 20, endCol: 3 };
// 活動清單（config 分頁 E 欄）
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

### `doPost(e)`（scriptWriteUrl）

寫入記帳資料至 `active` sheet（依 header 欄位對應）。
前端使用 `no-cors` 模式送出，無法讀取回應為正常行為。

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
| Remark | Remark | **活動名稱**（config E 欄下拉） |
| Name | Name | 使用者（Jerry_Hu / Alice_Lin） |

---

## 活動清單管理

- 維護於 `config` 分頁 E 欄（E1 標題，E2 起為活動名稱）
- 新增：E 欄末列新增一列；停用：刪除或清空該列
- 上限 50 筆（E2:E51）；需要更多請調高 `activityParams.endRow`
- 編輯 Sheets 後，兩位使用者重新整理 App 即同步

---

## 待辦事項（詳見 TODO.md）

1. **B2 活動管理**：App 內直接新增活動（需修改 GAS `doPost` 加入 `action=addActivity` 分支）
2. **後台數據儀表板**：網頁版年度統計 + 活動彙整，新增 `dashboard.html`，密碼存於 `config.js`
3. **Sheets 重整**：複製新試算表取得全新 URL → 更新 GAS 與 GitHub Secrets → 清除 git history 舊 URL
