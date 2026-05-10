# TODO

## Sheets 重整與安全性

**背景**
舊版原始碼中有 Google Sheets URL 硬編碼（已於 v3.2.0 移除）。
目前已將 Sheets 共用設定改為「限制存取」作為緊急處置。

**後續處理**
1. 複製現有試算表 → 取得全新 URL（舊 URL 永久失效）
2. 在新試算表重新部署 GAS 腳本
3. 更新 GitHub Secrets：`SHEET_URL`、`SCRIPT_WRITE_URL`、`SCRIPT_READ_URL`
4. 確認新 Sheets 結構與現有程式碼一致（年度 sheet row 11–19，9 個大類）
5. 選擇性清除 git history 中的舊 URL（`git filter-repo`）
