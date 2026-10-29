# 部署與維運

## 架構

```
手機 / 瀏覽器 ── GitHub Pages（gh-pages 分支，靜態檔 + config.js）
                     │  fetch GET + token（存取碼，存於各裝置 localStorage）
                     ▼
              GAS Web App（/exec，單一部署；驗證 Script Property API_TOKEN）
                     │  Script Property BOOKKEEPING_SPREADSHEET_ID
                     ▼
              Google Sheets（限制存取）
```

## 敏感設定

`config.js` 被 gitignore，部署時由 GitHub Actions 以 Secrets 產生；本機開發請從
`config.example.js` 複製一份。

| `config.js` 欄位 | Actions Secret | 說明 |
|------------------|----------------|------|
| `scriptReadUrl` | `SCRIPT_READ_URL` | GAS `/exec` 網址（所有讀寫共用） |
| `sheetUrl` | `SHEET_URL` | 試算表網址（僅供首頁「試算表」連結；GAS 不使用） |

**存取碼**不在 `config.js`，存於 GAS Script Property `API_TOKEN`（`setApiToken()` 設定）。
每台裝置第一次開啟任一頁面時輸入一次，存於該裝置 `localStorage`；「登出」會清除。

> `/exec` 網址會出現在公開的 gh-pages `config.js` 中，沒有存取碼也無法讀寫。
> 試算表本身維持「限制存取」。
>
> **更換存取碼**：Apps Script 執行 `setApiToken()` 產生新碼 → 立即生效，所有裝置下次請求時
> 會被要求重新輸入。存取碼外洩時照此處理。

---

## 前端部署

`main` 分支 push → [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)
產生 `config.js` → 發布到 `gh-pages`。也可在 Actions 頁面手動 **Run workflow**
（例如只改了 Secrets 時）。

不發布的檔案：`.github`、`gas`、`docs`、`CLAUDE.md`、`README.md`、`config.example.js`、`.gitignore`。

## GAS 部署

詳細步驟與端點見 [gas/README.md](../gas/README.md)。重點：

- **改 `.gs` 後**：Deploy → Manage deployments → 編輯現有部署 → Version: **New version** → Deploy。
  網址不變，不用改 Secrets。不重新部署，`/exec` 不會更新。
- **只保留一個部署**。每個舊部署都固定在舊版程式並持續可用，不用的請**封存**。
- 觸發器（`processRecurringExpenses`）屬於專案，不屬於部署，封存部署不影響它。
- 本機 `gas/gas_backup/`（gitignored）是 Google 上舊版檔案的快照，僅供備份對照。

### 更換部署（新網址）時

1. 先 New deployment（執行身分：我；存取：所有人），取得新 `/exec`
2. 更新 Secret `SCRIPT_READ_URL` 與本機 `config.js`
3. 重新部署前端，實測記帳 / 後台 / 週期頁
4. 確認無誤後才封存舊部署（封存不可逆）

---

## 分支與 PR

- 開發分支 `Claude`（或功能分支）→ PR → `main`
- **合併請用「Create a merge commit」**。用 Squash 合併後，開發分支歷史會與 `main`
  分岔，下一個 PR 會出現假衝突；若已 squash，合併後將開發分支對齊 `main`：
  ```
  git switch Claude
  git reset --hard origin/main
  git push --force origin Claude
  ```
- Commit 訊息格式：`[Type]: summary`，Type 如 `Feat` / `Fix` / `Refactor` / `Security` / `Docs` / `Chore`

## 發版

1. `index.html` 的 `form-card__version` 更新版本號
2. [CHANGELOG.md](CHANGELOG.md) 新增一節
3. [CLAUDE.md](../CLAUDE.md) 的「目前版本」

---

## 疑難排解

| 症狀 | 原因 / 處理 |
|------|-------------|
| 首頁預算顯示 NaN 或空白 | 年度分頁不存在（新年度未複製）或列結構錯位 |
| 儀表板 Total 數字錯位 | 年度分頁 Row 20 空白分隔列被刪除 |
| 讀取請求出現 CORS 錯誤 | GAS 拋例外時回傳 HTML 錯誤頁（無 CORS header）；直接在瀏覽器開 `/exec?token=…&action=ping` 看錯誤訊息 |
| 每次打開都要求輸入存取碼 | 瀏覽器封鎖 / 清除了網站資料（私密瀏覽、清除 Cookie），或存取碼已被更換 |
| 輸入存取碼一直顯示錯誤 | GAS 尚未部署含驗證的新版本，或尚未執行 `setApiToken()` |
| 改了 GAS 沒生效 | 沒有部署 New version |
| 週期頁顯示「尚未安裝每日觸發器」 | 在 Apps Script 執行一次 `setupRecurringExpenses()` |
| GAS 整個專案無法執行 | 頂層（function 外）使用了 `$` |
| 試算表日期變成前一天「12:00:00」、時間戳格式不同 | v3.6.1 以前以 Date 寫入造成。Apps Script 執行 `findShiftedDates()` 檢視，再 `fixShiftedDates()` 修正 |
