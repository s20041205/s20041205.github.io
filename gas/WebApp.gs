/**
 * Web App 進入點：doGet（讀取 / 查詢）與 doPost（寫入）。
 *
 * doGet  → scriptReadUrl：範圍讀取、近期記錄、彙整、更新 / 刪除、週期性花費
 * doPost → scriptWriteUrl：寫入 active 記帳資料、新增標記
 *
 * 前端一律以 no-cors 送出 POST，讀不到回應屬正常行為。
 */

'use strict';

// ── doGet：依 action 分派 ────────────────────────────────────────────────────
function doGet(e) {
  var params = (e && e.parameter) || {};

  try {
    switch (params.action) {
      // 週期性花費（RecurringExpenses.gs）
      case 'recurringExpenses':
        return jsonResponse_(listRecurringExpenses_(getBookkeepingSpreadsheet_()));
      case 'saveRecurringExpense':
        return jsonResponse_(saveRecurringExpense_(getBookkeepingSpreadsheet_(), params));
      case 'setRecurringExpenseActive':
        return jsonResponse_(setRecurringExpenseActive_(getBookkeepingSpreadsheet_(), params));
      case 'deleteRecurringExpense':
        return jsonResponse_(deleteRecurringExpense_(getBookkeepingSpreadsheet_(), params));
      case 'runRecurringExpenses':
        return jsonResponse_(processRecurringExpensesForDate_(new Date()));

      // 後台查詢 / 編輯（Records.gs）
      case 'recentRecords':
        return handleRecentRecords_(params);
      case 'subSummary':
        return handleSubSummary_(params);
      case 'tagSummary':
        return handleTagSummary_(params);
      case 'updateRecord':
        return handleUpdateRecord_(params);
      case 'deleteRecord':
        return handleDeleteRecord_(params);
    }
  } catch (err) {
    return jsonResponse_({ result: 'error', error: String(err) });
  }

  // 無 action：範圍讀取
  return handleRangeRead_(params);
}

// ── doGet：範圍讀取（回傳逗號分隔字串）─────────────────────────────────────
// 前端仍會帶 sheetUrl，但一律忽略，只讀 Script Property 指定的記帳試算表。
function handleRangeRead_(params) {
  var sheetTag = params.sheetTag;
  var row    = parsePositiveInteger_(params.row);
  var col    = parsePositiveInteger_(params.col);
  var endRow = parsePositiveInteger_(params.endRow);
  var endCol = parsePositiveInteger_(params.endCol);

  if (!sheetTag ||
      !row || !col || !endRow || !endCol ||
      endRow < row || endCol < col) {
    return ContentService.createTextOutput('');
  }

  var ss = getBookkeepingSpreadsheet_();
  var sheet = ss.getSheetByName(sheetTag);
  if (!sheet) return ContentService.createTextOutput('');

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (row > lastRow || col > lastCol) return ContentService.createTextOutput('');

  var rowRange = Math.min(endRow - row + 1, lastRow - row + 1);
  var colRange = Math.min(endCol - col + 1, lastCol - col + 1);

  var data = sheet.getSheetValues(row, col, rowRange, colRange);
  return ContentService.createTextOutput(data);
}

// ── doPost：寫入 ────────────────────────────────────────────────────────────
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var params = (e && e.parameter) || {};
    var doc = getBookkeepingSpreadsheet_();

    // 分支一：新增標記
    if (params.action === 'addActivity') {
      return addActivity_(doc, params.name);
    }

    // 分支二：寫入記帳資料
    var sheet   = doc.getSheetByName(ACTIVE_SHEET_NAME);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow() + 1;

    var timezone = Session.getScriptTimeZone() || 'GMT+8';
    var stamp    = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd HH:mm:ss');

    var FREE_TEXT = { Store: true, Detail: true, Tag: true };
    var newRow = headers.map(function (header) {
      if (header === 'Update') return stamp;
      var val = params[header];
      if (val == null) return '';
      return FREE_TEXT[header] ? sanitizeCell_(val) : val;
    });
    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);

    return jsonResponse_({ result: 'success', row: nextRow });
  } catch (err) {
    return jsonResponse_({ result: 'error', error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** 在 config 分頁 E 欄第一個空列寫入新標記。 */
function addActivity_(doc, rawName) {
  var name = sanitizeCell_(String(rawName == null ? '' : rawName).trim());
  if (!name) return jsonResponse_({ result: 'error', error: 'empty name' });

  var configSheet = doc.getSheetByName('config');
  var eRange = configSheet.getRange('E2:E51').getValues();
  for (var i = 0; i < eRange.length; i++) {
    if (!eRange[i][0]) {
      configSheet.getRange(i + 2, 5).setValue(name);
      return jsonResponse_({ result: 'success', row: i + 2 });
    }
  }
  return jsonResponse_({ result: 'error', error: 'activity list full (E2:E51)' });
}
