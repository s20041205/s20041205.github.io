# TODO

## B2：App 內新增活動

目前新增活動需直接編輯 Google Sheets `config` 分頁 E 欄。
若要在 App 內直接新增：

- GAS `doPost` 加入 `action=addActivity` 分支，寫入 config E 欄下一個空列
- App 活動下拉旁加「＋」按鈕，輸入後 POST 至 `scriptWriteUrl`
- 前端樂觀更新（`no-cors` 無法讀取回應，直接加入本地清單）

詳細實作方式可參考對話記錄。

---

## 後台數據儀表板（網頁版）

**背景**
目前各年度統計資料存於 Google Sheets，需直接開啟試算表才能檢視。
希望未來能在記帳網頁上進入有密碼保護的後台，直接查看統計數據。

**需求**
- 輸入密碼後進入後台（密碼存於 `config.js`，gitignore 保護）
- 顯示各年度花費統計（月份 / 類別分析）
- 顯示各活動花費明細與總額彙整
- 資料來源透過現有 `scriptReadUrl` 從 Google Sheets 讀取

**影響範圍**
- 前端：新增 `dashboard.html` 或單頁切換模式
- Google Sheets：確認各年度統計分頁格式，供 `scriptReadUrl` 讀取
- 認證：前端密碼驗證（`config.js` 存放）

---

## Sheets 重整與安全性

**背景**
舊版原始碼中有 Google Sheets URL 硬編碼（已於 v3.2.0 移除）。
目前已將 Sheets 共用設定改為「限制存取」作為緊急處置。

**後續處理**
1. 複製現有試算表 → 取得全新 URL（舊 URL 永久失效）
2. 在新試算表重新部署 GAS 腳本
3. 更新 GitHub Secrets：`SHEET_URL`、`SCRIPT_WRITE_URL`、`SCRIPT_READ_URL`
4. 確認新 Sheets 結構與現有程式碼一致（尤其年度 sheet row 11–20 順序）
5. 選擇性清除 git history 中的舊 URL（`git filter-repo`）
