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

// 存取碼存放的 Script Property 名稱（執行一次 setApiToken() 設定）
var API_TOKEN_PROP = 'API_TOKEN';

/**
 * 檢查請求是否帶有正確的存取碼（params.token）。
 * 未設定 API_TOKEN 時一律拒絕（fail closed）。
 */
function isAuthorized_(params) {
  var expected = PropertiesService.getScriptProperties().getProperty(API_TOKEN_PROP);
  if (!expected) return false;
  return String((params && params.token) || '') === expected;
}

function unauthorizedResponse_() {
  return jsonResponse_({ result: 'error', error: 'unauthorized' });
}

/**
 * 取得記帳試算表（所有端點共用，不信任前端傳入的 sheetUrl）。
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

// ── 日期 ────────────────────────────────────────────────────────────────────
// 試算表時區可能與腳本時區（Asia/Taipei）不同。寫入日期一律用 'yyyy-MM-dd' 字串，
// 讓試算表依自己的時區解讀成純日期；切勿 setValue(new Date(...))，否則會被換算成
// 前一天中午之類的時間。讀取儲存格的 Date 時，用試算表時區格式化。

var sheetTimeZoneCache_ = null;

function spreadsheetTimeZone_() {
  if (!sheetTimeZoneCache_) {
    sheetTimeZoneCache_ = getBookkeepingSpreadsheet_().getSpreadsheetTimeZone();
  }
  return sheetTimeZoneCache_;
}

/** 儲存格的日期值 → 'yyyy-MM-dd'（空值回傳 ''）。 */
function cellDateString_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, spreadsheetTimeZone_(), 'yyyy-MM-dd');
  return String(value == null ? '' : value).substring(0, 10);
}

/** 目前時間 'yyyy-MM-dd HH:mm:ss'（腳本時區），用於 Update / CreatedAt 等時間戳。 */
function nowStamp_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+8', 'yyyy-MM-dd HH:mm:ss');
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
