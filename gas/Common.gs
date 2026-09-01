/**
 * 共用常數與工具函式。
 *
 * ⚠️ 部署方式：Apps Script 編輯器 → Deploy → Manage deployments → New version。
 *    不重新部署，Web App endpoint 不會更新。
 * ⚠️ 頂層（function 外）絕對不要使用 `$`，會導致整個專案無法執行。
 */

'use strict';

// active 記帳主表分頁名稱
var ACTIVE_SHEET_NAME = 'active';

// 記帳試算表 ID 存放的 Script Property 名稱（執行一次 initialSetup() 設定）
var SPREADSHEET_ID_PROP = 'BOOKKEEPING_SPREADSHEET_ID';

/**
 * 取得記帳試算表（寫入端點使用）。
 * ID 來源優先序：Script Property BOOKKEEPING_SPREADSHEET_ID → 舊版 'key' → 綁定的試算表。
 */
function getBookkeepingSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = String(props.getProperty(SPREADSHEET_ID_PROP) || props.getProperty('key') || '').trim();
  if (id) return SpreadsheetApp.openById(id);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('缺少 Script Property ' + SPREADSHEET_ID_PROP + '，請先執行 initialSetup()');
}

/** 以 JSON 回應。 */
function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 防止試算表公式注入：開頭為 = + - @ 或 tab / CR 的字串前面加上單引號。
 * 僅用於自由文字欄位（店家 / 項目 / 標記）；數字、日期、下拉選項不需處理。
 */
function sanitizeCell_(value) {
  var text = String(value == null ? '' : value);
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

/** 嚴格解析正整數，非正整數一律回傳 0。 */
function parsePositiveInteger_(value) {
  var text = String(value == null ? '' : value).trim();
  if (!/^\d+$/.test(text)) return 0;
  var parsed = Number(text);
  return isFinite(parsed) && parsed > 0 && Math.floor(parsed) === parsed ? parsed : 0;
}
