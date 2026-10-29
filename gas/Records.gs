/**
 * 後台儀表板用的查詢與編輯 action（透過 doGet，已於 doGet 驗證 token）。
 *
 * 試算表一律由 getBookkeepingSpreadsheet_()（Script Property）取得，
 * 前端傳入的 sheetUrl 參數會被忽略，避免被拿來操作其他試算表。
 *
 * active 分頁欄位（1-indexed）：
 *   1 Date  2 Month  3 Balance  4 Topclass  5 Subclass  6 Price
 *   7 Store 8 Detail 9 Recommendation 10 Name 11 Update 12 Tag  13 RecurringKey
 */

'use strict';

var RECENT_RECORDS_MAX_ = 200;

/**
 * 一列記帳的指紋（日期、金額、店家、項目、使用者、寫入時間）。
 * 編輯 / 刪除時前端帶回指紋，與該列目前內容比對；列號因刪除而位移時會對不上，
 * 藉此避免改到或刪到錯的列。
 */
function recordKey_(row) {
  var timezone = Session.getScriptTimeZone() || 'GMT+8';
  return [row[0], row[5], row[6], row[7], row[9], row[10]].map(function (v) {
    return v instanceof Date ? Utilities.formatDate(v, timezone, 'yyyy-MM-dd HH:mm:ss') : String(v);
  }).join('|');
}

/** 檢查 rowNum 與指紋；不符回傳錯誤物件，相符回傳 null。 */
function checkRecordKey_(sheet, rowNum, key) {
  if (!rowNum || rowNum < 2 || rowNum > sheet.getLastRow()) {
    return { result: 'error', error: 'invalid rowNum' };
  }
  var current = sheet.getRange(rowNum, 1, 1, 12).getValues()[0];
  if (!key || recordKey_(current) !== key) {
    return { result: 'error', error: 'stale' };
  }
  return null;
}

// ── 近期記錄（倒序）─────────────────────────────────────────────────────────
function handleRecentRecords_(params) {
  var count   = Math.min(parseInt(params.count, 10) || 20, RECENT_RECORDS_MAX_);
  var doc     = getBookkeepingSpreadsheet_();
  var sheet   = doc.getSheetByName('active');
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
  }

  var firstRow = Math.max(2, lastRow - count + 1);
  var numRows  = lastRow - firstRow + 1;
  var values   = sheet.getRange(firstRow, 1, numRows, 12).getValues();

  var result = [];
  for (var i = values.length - 1; i >= 0; i--) {
    var r   = values[i];
    var dateStr = cellDateString_(r[0]);
    result.push({
      rowNum:         firstRow + i,
      date:           dateStr,
      month:          r[1],
      balance:        r[2],
      topclass:       r[3],
      subclass:       r[4],
      price:          r[5],
      store:          r[6],
      detail:         r[7],
      recommendation: r[8],
      name:           r[9],
      tag:            r[11],
      key:            recordKey_(r)
    });
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 支出細項彙整 ───────────────────────────────────────────────────────────
function handleSubSummary_(params) {
  var filterYear = params.year || '';
  var filterName = params.name || '';
  var doc    = getBookkeepingSpreadsheet_();
  var sheet  = doc.getSheetByName('active');
  var rows   = sheet.getDataRange().getValues();
  var result = {};

  for (var i = 1; i < rows.length; i++) {
    var r        = rows[i];
    var dateVal  = r[0];
    var balance  = r[2];
    var topclass = r[3];
    var subclass = String(r[4] || '');
    var price    = parseFloat(r[5]) || 0;
    var name     = String(r[9] || '');

    if (balance !== '支出') continue;
    if (filterName && name !== filterName) continue;

    var dateStr = cellDateString_(dateVal);
    var rowYear = dateStr.substring(0, 4);
    if (filterYear && rowYear !== filterYear) continue;

    var month = parseInt(dateStr.substring(5, 7), 10) - 1;

    if (!result[topclass]) result[topclass] = {};
    if (!result[topclass][subclass]) {
      result[topclass][subclass] = { total: 0, monthly: [0,0,0,0,0,0,0,0,0,0,0,0] };
    }
    result[topclass][subclass].total += price;
    if (month >= 0 && month < 12) result[topclass][subclass].monthly[month] += price;
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 標記彙整 ───────────────────────────────────────────────────────────────
function handleTagSummary_(params) {
  var filterYear = params.year || '';
  var filterName = params.name || '';
  var doc    = getBookkeepingSpreadsheet_();
  var sheet  = doc.getSheetByName('active');
  var rows   = sheet.getDataRange().getValues();
  var result = {};

  for (var i = 1; i < rows.length; i++) {
    var r        = rows[i];
    var dateVal  = r[0];
    var balance  = r[2];
    var topclass = r[3];
    var price    = parseFloat(r[5]) || 0;
    var name     = String(r[9] || '');
    var tag      = String(r[11] || '').trim();

    if (!tag || balance !== '支出') continue;
    if (filterName && name !== filterName) continue;

    var dateStr = cellDateString_(dateVal);
    var rowYear = dateStr.substring(0, 4);
    if (filterYear && rowYear !== filterYear) continue;

    if (!result[tag]) result[tag] = { total: 0, cats: {} };
    result[tag].total += price;
    result[tag].cats[topclass] = (result[tag].cats[topclass] || 0) + price;
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 更新記錄 ───────────────────────────────────────────────────────────────
function handleUpdateRecord_(params) {
  var rowNum = parseInt(params.rowNum, 10);
  var doc    = getBookkeepingSpreadsheet_();
  var sheet  = doc.getSheetByName('active');
  var lock   = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var err = checkRecordKey_(sheet, rowNum, params.key);
    if (err) return jsonResponse_(err);
    writeRecordFields_(sheet, rowNum, params);
  } finally {
    lock.releaseLock();
  }
  return jsonResponse_({ result: 'ok' });
}

function writeRecordFields_(sheet, rowNum, params) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(params.Date || '')) {
    // 寫入字串而非 Date，避免試算表時區換算成前一天（見 Common.gs 日期說明）
    sheet.getRange(rowNum, 1).setValue(params.Date);
    sheet.getRange(rowNum, 2).setValue(parseInt(params.Date.substring(5, 7), 10));  // Month 自動同步
  }
  if (params.Balance)                sheet.getRange(rowNum,  3).setValue(params.Balance);
  if (params.Topclass)               sheet.getRange(rowNum,  4).setValue(params.Topclass);
  if (params.Subclass !== undefined) sheet.getRange(rowNum,  5).setValue(sanitizeCell_(params.Subclass));
  if (params.Price)                  sheet.getRange(rowNum,  6).setValue(parseFloat(params.Price) || 0);
  if (params.Store  !== undefined)   sheet.getRange(rowNum,  7).setValue(sanitizeCell_(params.Store));
  if (params.Detail !== undefined)   sheet.getRange(rowNum,  8).setValue(sanitizeCell_(params.Detail));
  if (params.Recommendation)         sheet.getRange(rowNum,  9).setValue(params.Recommendation);
  if (params.Name)                   sheet.getRange(rowNum, 10).setValue(params.Name);
  if (params.Tag !== undefined)      sheet.getRange(rowNum, 12).setValue(sanitizeCell_(params.Tag));
  // Update（col 11）不修改，保留原始寫入時間戳
}

// ── 刪除記錄 ───────────────────────────────────────────────────────────────
function handleDeleteRecord_(params) {
  var rowNum = parseInt(params.rowNum, 10);
  var doc    = getBookkeepingSpreadsheet_();
  var sheet  = doc.getSheetByName('active');
  var lock   = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var err = checkRecordKey_(sheet, rowNum, params.key);
    if (err) return jsonResponse_(err);
    sheet.deleteRow(rowNum);
  } finally {
    lock.releaseLock();
  }
  return jsonResponse_({ result: 'ok' });
}
