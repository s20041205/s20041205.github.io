# 前端頁面

三個頁面皆為 Vanilla JS，共用 `config.js`（`APP_CONFIG`）與 `css/style.css` 的 CSS 變數。
大類 / 小類清單在三個 JS 檔各有一份，**修改類別時三處都要同步**，並同步
`gas/RecurringExpenses.gs` 的 `RECURRING_SUBCLASSES_`。

| 頁面 | JS | CSS | 用途 |
|------|----|-----|------|
| `index.html` | `js/script.js` | `style.css` | 記帳表單（主畫面、PWA 入口） |
| `dashboard.html` | `js/dashboard.js` | `style.css` + `dashboard.css` | 後台儀表板（密碼保護） |
| `recurring.html` | `js/recurring.js` | `style.css` + `dashboard.css` + `recurring.css` | 週期性花費管理（密碼保護） |

---

## 記帳表單（index.html）

- 送出：`POST scriptWriteUrl`，`mode: 'no-cors'`，讀不到回應屬正常，`.then()` 一律視為成功
- 大類 / 小類下拉依「收入 / 支出」切換；選支出大類時顯示該類年度剩餘預算
- 標記下拉：讀 `config!E2:E51`，「＋」可直接新增（`doPost action=addActivity`）
- 日期快捷：昨天 / 明天
- 連續記帳開關：送出後保留店家 / 項目，清空金額 / 星評 / 標記，焦點回到金額
- 自動完成：店家 / 項目存 `localStorage`，各最多 50 筆，可一鍵清除
- 版本號顯示於表單標題旁（`form-card__version`），發版時更新

## 後台儀表板（dashboard.html）

- 認證：前端比對 `APP_CONFIG.dashboardPassword`，通過後 `sessionStorage.dash_auth = '1'`
- 圖表：Chart.js 4（jsDelivr CDN）

| Tab | 內容 |
|-----|------|
| 年度總覽 | 收支卡片、月份趨勢長條圖、收入 / 支出圓餅圖（點扇形或圖例可下鑽細項） |
| 月份詳細 | 支出對比預算橫條圖、收入 / 支出圓餅圖（含下鑽）；月份前後切換 |
| 標記彙整 | 標記金額排行 + 彙整表；本年 / 全部年份、個人篩選 |
| 近期修改 | 最近 N 筆，行內編輯所有欄位、刪除；個人篩選 |

使用的 GAS action：`recentRecords`、`subSummary`、`tagSummary`、`updateRecord`、`deleteRecord`。

## 週期性花費（recurring.html）

- 認證沿用後台（同一個 `dash_auth`）
- 卡片列表：新增 / 編輯 / 啟用切換 / 刪除；「手動補跑」= `runRecurringExpenses`
- 頂端提醒：GAS 回傳 `automationEnabled: false`（觸發器未安裝）時顯示
- 使用的 GAS action：`recurringExpenses`、`saveRecurringExpense`、
  `setRecurringExpenseActive`、`deleteRecurringExpense`、`runRecurringExpenses`

## PWA

- `manifest.json` + `icons/icon.svg` + iOS meta，可「加到主畫面」
- **沒有 service worker，不支援離線**（2026-10 評估後決定暫不需要，見 [TODO.md](TODO.md)）
