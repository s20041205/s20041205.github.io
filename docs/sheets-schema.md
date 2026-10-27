# Google Sheets 結構

記帳資料庫為一份 Google 試算表。GAS 以 Script Property `BOOKKEEPING_SPREADSHEET_ID`
指定，前端傳入的 `sheetUrl` 一律忽略（見 [gas/README.md](../gas/README.md)）。

| 分頁 | 用途 | 誰寫入 |
|------|------|--------|
| `config` | 支出預算、標記清單 | 手動編輯；App「＋」新增標記 |
| `active` | 記帳資料主表（每筆一列） | App 表單、後台編輯、週期性花費 |
| `2026` 等年度分頁 | 年度 / 每月彙整統計（公式） | 公式自動計算 |
| `recurringExpenses` | 週期性花費（訂閱）設定 | `recurring.html` |

---

## `config` 分頁

| 欄 | 列 | 內容 |
|----|----|------|
| A–C | 1 | 標題列（項目 / 預算 / 比例） |
| A–B | 2–10 | 9 個支出大類預算 |
| A–C | 13 | Total 合計 |
| E | 1 | 標記清單標題 |
| E | 2–51 | 標記名稱（最多 50 筆） |

支出大類順序（必須與年度分頁 Row 11–19 一致）：

```
index 0: 飲食   1: 衣裝   2: 居住   3: 交通   4: 教育
index 5: 娛樂   6: 健康   7: 社交   8: 其他
```

> v3.3.0 移除「育兒」大類（改用標記跨類追蹤），類別從 10 個減為 9 個；疫苗移入健康，玩具移入娛樂。

### 標記清單

- 格式：`YYMMDD_名稱`（有時效性）或直接輸入名稱（永久）
- 有日期前綴的標記，事件日期超過 `ACTIVITY_EXPIRE_DAYS`（[js/script.js](../js/script.js) 頂部，預設 30）天後自動從下拉隱藏
- 新增：App 內「＋」按鈕（自動帶入今日 `YYMMDD_` 前綴）或直接編輯 E 欄
- 停用：刪除或清空該列
- 上限 50 筆（E2:E51）；需要更多請調高 `activityParams.endRow`
- 編輯後兩位使用者重新整理 App 即同步

**設計意圖**：標記是**跨大類的情境標籤**（育兒、旅行、裝潢…）。例如兒科疫苗記為
「健康 > 疫苗 + 標記 `育兒`」，健康類統計仍涵蓋所有醫療支出，又能另外彙整育兒花費。

---

## `active` 分頁（記帳主表）

GAS `doPost` 依第 1 列 header 名稱對應表單參數寫入，欄位順序可調整但名稱不可改。

| Col | 欄位 | 說明 |
|-----|------|------|
| A | Date | 日期（YYYY-MM-DD） |
| B | Month | 月份數字（前端從 Date 計算） |
| C | Balance | 收入 / 支出 |
| D | Topclass | 大類 |
| E | Subclass | 小類 |
| F | Price | 金額 |
| G | Store | 店家 |
| H | Detail | 項目 |
| I | Recommendation | 推薦星評 |
| J | Name | 使用者（Jerry_Hu / Alice_Lin） |
| K | Update | 寫入時間戳（GAS 自動填入） |
| L | Tag | 標記名稱 |
| M | RecurringKey | 週期性花費去重鍵（`Id|YYYY-MM-DD`；一般記帳留空） |

表單 `name` 屬性與欄位名稱一一相同（`Month` 為 hidden 欄位）。

---

## 年度統計分頁（如 `2026`）

每年一個分頁，以公式彙整 `active`。**新增年度：複製前一年分頁，修改 E2 日期的年份。**

### 列

| Row | 內容 |
|-----|------|
| 1 | 備註列（忽略） |
| 2 | 月份標題（E2 起，每月 2 欄：金額 + 百分比） |
| 3–10 | 收入細項（薪資、利息、獎金、投資、販賣、租金、還款、其他） |
| 11–19 | 支出細項（飲食、衣裝、居住、交通、教育、娛樂、健康、社交、其他） |
| 20 | **空白分隔列** |
| 21 | 收入 Total |
| 22 | 支出 Total |
| 23 | 淨利 |

> ⚠️ Row 20 必須保留為空白列，否則儀表板 Total 的 index 會錯位。

### 欄

| Col | 內容 |
|-----|------|
| A | 收入 / 支出（僅區段第一列有值） |
| B | 細項名稱 |
| C | 年度累計金額 |
| D | 年度佔比 % |
| E–F | 1 月（金額 + %） |
| G–H | 2 月 |
| … | 每月 2 欄，共 12 個月（至 AB 欄） |

---

## `recurringExpenses` 分頁

由 `setupRecurringExpenses()` 建立，欄位定義見 `RECURRING_HEADERS_`
（[gas/RecurringExpenses.gs](../gas/RecurringExpenses.gs)）：

`Id, Service, Website, Price, Topclass, Subclass, Store, Detail, Recommendation, Name, Tag,
Frequency, Interval, StartDate, NextDate, EndDate, Active, LastRunDate, CreatedAt, UpdatedAt`

- `Frequency`：`weekly` / `monthly` / `yearly`；`Interval`：每幾個週期（1–60）
- 每日 03:15 觸發器補記 `NextDate ≤ 今天` 的每一期（單項單次上限 120 期），並前進 `NextDate`
- 超過 `EndDate` 自動停用

---

## 前端讀取範圍對照

範圍讀取 = `doGet` 無 `action`，參數 `sheetTag,row,col,endRow,endCol`，回傳逗號分隔字串。

| 檔案 | 用途 | sheetTag | 範圍 |
|------|------|----------|------|
| `js/script.js` | 預算 | `config` | R2–10 × C1–2 |
| `js/script.js` | 年度已使用金額 | 當年度 | R11–19 × C2–3 |
| `js/script.js` | 標記清單 | `config` | R2–51 × C5 |
| `js/dashboard.js` | 年度統計 | 選取年度 | R3–23 × C2–27（21 列 × 26 欄） |
| `js/dashboard.js` | 預算 | `config` | R2–10 × C1–2 |
| `js/dashboard.js` | 標記清單 | `config` | R2–51 × C5 |

儀表板年度資料 0-indexed 對應：0–7 收入細項、8–16 支出細項、17 空白、
18 收入 Total、19 支出 Total、20 淨利（`INCOME_ROWS` / `IDX_*` 常數）。
