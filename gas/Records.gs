/**
 * 後台儀表板用的查詢與編輯 action（透過 scriptReadUrl / doGet）。
 *
 * 這些 handler 目前以 params.sheetUrl 開啟試算表（前端傳入），與範圍讀取一致。
 * ⚠️ 安全備註：Web App 為 ANYONE_ANONYMOUS，任何知道 endpoint 的人可對任意
 *    試算表讀 / 寫 / 刪列。若要收斂，改用 getBookkeepingSpreadsheet_() 並停止信任 sheetUrl。
 *
 * active 分頁欄位（1-indexed）：
 *   1 Date  2 Month  3 Balance  4 Topclass  5 Subclass  6 Price
 *   7 Store 8 Detail 9 Recommendation 10 Name 11 Update 12 Tag  13 RecurringKey
 */

'use strict';

// ── 近期記錄（倒序）─────────────────────────────────────────────────────────
function handleRecentRecords_(params) {
  var count   = parseInt(params.count, 10) || 20;
  var doc     = SpreadsheetApp.openByUrl(params.sheetUrl);
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
    var raw = r[0];
    var dateStr = raw instanceof Date
      ? raw.getFullYear() + '-' +
        String(raw.getMonth() + 1).padStart(2, '0') + '-' +
        String(raw.getDate()).padStart(2, '0')
      : String(raw).substring(0, 10);
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
      tag:            r[11]
    });
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 支出細項彙整 ───────────────────────────────────────────────────────────
function handleSubSummary_(params) {
  var filterYear = params.year || '';
  var filterName = params.name || '';
  var doc    = SpreadsheetApp.openByUrl(params.sheetUrl);
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

    var rowYear = dateVal instanceof Date
      ? String(dateVal.getFullYear())
      : String(dateVal).substring(0, 4);
    if (filterYear && rowYear !== filterYear) continue;

    var month = dateVal instanceof Date
      ? dateVal.getMonth()
      : (parseInt(String(dateVal).substring(5, 7), 10) - 1);

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
  var doc    = SpreadsheetApp.openByUrl(params.sheetUrl);
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

    var rowYear = dateVal instanceof Date
      ? String(dateVal.getFullYear())
      : String(dateVal).substring(0, 4);
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
  if (!rowNum || rowNum < 2) {
    return jsonResponse_({ result: 'error', msg: 'invalid rowNum' });
  }
  var doc   = SpreadsheetApp.openByUrl(params.sheetUrl);
  var sheet = doc.getSheetByName('active');

  if (params.Date) {
    var parts   = params.Date.split('-');
    var dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    sheet.getRange(rowNum, 1).setValue(dateObj);
    sheet.getRange(rowNum, 2).setValue(parseInt(parts[1], 10));  // Month 自動同步
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

  return jsonResponse_({ result: 'ok' });
}

// ── 刪除記錄 ───────────────────────────────────────────────────────────────
function handleDeleteRecord_(params) {
  var rowNum = parseInt(params.rowNum, 10);
  if (!rowNum || rowNum < 2) {
    return jsonResponse_({ result: 'error', msg: 'invalid rowNum' });
  }
  var doc   = SpreadsheetApp.openByUrl(params.sheetUrl);
  var sheet = doc.getSheetByName('active');
  sheet.deleteRow(rowNum);
  return jsonResponse_({ result: 'ok' });
}
