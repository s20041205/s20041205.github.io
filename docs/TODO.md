# TODO

## Sheets 重整（低優先）

**背景**：舊版原始碼曾硬編碼試算表 URL，現仍留在 git 歷史中。

**目前狀態（2026-10）**
- 試算表已設為「限制存取」，他人拿到 ID 也無法開啟
- GAS 不再信任前端傳入的 `sheetUrl`，舊部署已全部封存，只剩單一新部署

**若要徹底處理**
1. 複製現有試算表 → 取得全新 ID
2. Apps Script 執行 `setSpreadsheetId('<新ID>')`（若 GAS 綁定在舊試算表，需在新試算表重建專案並重新部署）
3. 更新 Secret `SHEET_URL`（若重建 GAS，也要更新 `SCRIPT_WRITE_URL`、`SCRIPT_READ_URL`）
4. 確認新試算表結構符合 [sheets-schema.md](sheets-schema.md)
5. 選擇性以 `git filter-repo` 清除 git 歷史中的舊 URL

---

## 已決定不做

- **PWA 離線（service worker）**（2026-10）：平常都在有網路的地方記帳，暫不需要。
  若未來要做，應做「離線暫存、恢復連線後補送」，只快取畫面意義不大。
