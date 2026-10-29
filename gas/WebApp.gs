/**
 * Web App 進入點：doGet（所有前端請求）與 doPost（相容用寫入）。
 *
 * 每個請求都必須帶 token 參數（Script Property API_TOKEN），否則回傳
 * { result: 'error', error: 'unauthorized' }。
 *
 * 前端一律以 GET 呼叫，才能讀到回應、確認寫入是否成功。
 */

'use strict';

// ── doGet：依 action 分派 ────────────────────────────────────────────────────
function doGet(e) {
  var params = (e && e.parameter) || {};
  if (!isAuthorized_(params)) return unauthorizedResponse_();

  try {
    switch (params.action) {
      // 存取碼驗證（前端輸入存取碼時呼叫）
      case 'ping':
        return jsonResponse_({ result: 'ok' });

      // 記帳寫入
      case 'addRecord':
        return jsonResponse_(appendRecord_(getBookkeepingSpreadsheet_(), params));
      case 'addActivity':
        return jsonResponse_(addActivity_(getBookkeepingSpreadsheet_(), params.name));

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

// ── doPost：相容用寫入（前端已改用 doGet action=addRecord / addActivity）──────
function doPost(e) {
  var params = (e && e.parameter) || {};
  if (!isAuthorized_(params)) return unauthorizedResponse_();

  try {
    var doc = getBookkeepingSpreadsheet_();
    if (params.action === 'addActivity') {
      return jsonResponse_(addActivity_(doc, params.name));
    }
    return jsonResponse_(appendRecord_(doc, params));
  } catch (err) {
    return jsonResponse_({ result: 'error', error: String(err) });
  }
}

/** 依 active 第 1 列 header 對應參數，附加一筆記帳。 */
function appendRecord_(doc, params) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet   = doc.getSheetByName(ACTIVE_SHEET_NAME);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow() + 1;

    var stamp   = nowStamp_();

    var FREE_TEXT = { Store: true, Detail: true, Tag: true };
    var newRow = headers.map(function (header) {
      if (header === 'Update') return stamp;
      if (header === 'RecurringKey') return '';
      var val = params[header];
      if (val == null) return '';
      return FREE_TEXT[header] ? sanitizeCell_(val) : val;
    });
    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);

    return { result: 'success', row: nextRow };
  } finally {
    lock.releaseLock();
  }
}

/** 在 config 分頁 E 欄第一個空列寫入新標記。 */
function addActivity_(doc, rawName) {
  var name = sanitizeCell_(String(rawName == null ? '' : rawName).trim());
  if (!name) return { result: 'error', error: 'empty name' };

  var configSheet = doc.getSheetByName('config');
  var eRange = configSheet.getRange('E2:E51').getValues();
  for (var i = 0; i < eRange.length; i++) {
    if (!eRange[i][0]) {
      configSheet.getRange(i + 2, 5).setValue(name);
      return { result: 'success', row: i + 2 };
    }
  }
  return { result: 'error', error: 'activity list full (E2:E51)' };
}
