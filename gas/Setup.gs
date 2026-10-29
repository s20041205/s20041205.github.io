/**
 * 一次性設定與測試工具 —— 僅在 Apps Script 編輯器手動執行，不對外開放。
 * 這些函式不會被 doGet / doPost 呼叫。
 */

'use strict';

/**
 * 部署後執行一次：把「目前綁定的試算表」ID 寫入 Script Property。
 * 若為獨立式（非綁定）專案，改用 setSpreadsheetId('<試算表ID>')。
 */
function initialSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('此專案未綁定試算表，請改執行 setSpreadsheetId("<試算表ID>")');
  }
  PropertiesService.getScriptProperties().setProperty(SPREADSHEET_ID_PROP, ss.getId());
  Logger.log('已設定 ' + SPREADSHEET_ID_PROP + ' = ' + ss.getId());
  return ss.getId();
}

/** 手動指定記帳試算表 ID（從程式編輯器的執行紀錄或 Apps Script console 呼叫）。 */
function setSpreadsheetId(id) {
  var clean = String(id || '').trim();
  if (!/^[a-zA-Z0-9_-]{20,}$/.test(clean)) throw new Error('試算表 ID 格式不正確');
  PropertiesService.getScriptProperties().setProperty(SPREADSHEET_ID_PROP, clean);
  Logger.log('已設定 ' + SPREADSHEET_ID_PROP + ' = ' + clean);
}

/** 顯示目前設定的試算表 ID。 */
function showConfiguredSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  Logger.log(SPREADSHEET_ID_PROP + ' = ' + props.getProperty(SPREADSHEET_ID_PROP));
  Logger.log('legacy "key" = ' + props.getProperty('key'));
}

/**
 * 設定前端存取碼（Script Property API_TOKEN）。
 * 不帶參數執行會產生一組 12 字元隨機存取碼並寫入執行紀錄；
 * 也可在編輯器以 setApiToken('自訂存取碼') 指定（至少 8 字元）。
 * 更換存取碼後，所有裝置都要重新輸入。
 */
function setApiToken(code) {
  var token = String(code || '').trim();
  if (!token) token = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  if (token.length < 8) throw new Error('存取碼至少 8 字元');
  PropertiesService.getScriptProperties().setProperty(API_TOKEN_PROP, token);
  Logger.log('已設定存取碼：' + token);
}

/**
 * 找出因時區換算而偏移的日期（v3.6.1 以前週期記帳 / 後台編輯以 Date 寫入造成，
 * 例如 9/18 變成「9/17 12:00:00」）。只列出、不修改，結果寫入執行紀錄。
 */
function findShiftedDates() {
  fixShiftedDates_(false);
}

/** 修正 findShiftedDates() 列出的日期（改寫為正確的 'yyyy-MM-dd'）。先執行 find 確認清單。 */
function fixShiftedDates() {
  fixShiftedDates_(true);
}

function fixShiftedDates_(apply) {
  var doc      = getBookkeepingSpreadsheet_();
  var sheetTz  = doc.getSpreadsheetTimeZone();
  var scriptTz = Session.getScriptTimeZone();
  // 欄位為 1-indexed：active 的 Date；recurringExpenses 的 StartDate / NextDate / EndDate / LastRunDate
  var targets = [
    { name: ACTIVE_SHEET_NAME,     cols: [1] },
    { name: RECURRING_SHEET_NAME_, cols: [14, 15, 16, 18] }
  ];
  var count = 0;
  Logger.log('試算表時區 ' + sheetTz + '，腳本時區 ' + scriptTz);

  targets.forEach(function (t) {
    var sheet = doc.getSheetByName(t.name);
    if (!sheet || sheet.getLastRow() < 2) return;
    var numRows = sheet.getLastRow() - 1;
    t.cols.forEach(function (col) {
      var values = sheet.getRange(2, col, numRows, 1).getValues();
      for (var i = 0; i < values.length; i++) {
        var v = values[i][0];
        if (!(v instanceof Date)) continue;
        // 純日期在試算表時區是 00:00:00；有時間部分的就是被換算過的
        if (Utilities.formatDate(v, sheetTz, 'HH:mm:ss') === '00:00:00') continue;
        var intended = Utilities.formatDate(v, scriptTz, 'yyyy-MM-dd');
        Logger.log(t.name + ' 第 ' + (i + 2) + ' 列 第 ' + col + ' 欄：' +
          Utilities.formatDate(v, sheetTz, 'yyyy-MM-dd HH:mm:ss') + ' → ' + intended);
        if (apply) sheet.getRange(i + 2, col).setValue(intended);
        count++;
      }
    });
  });

  // 時間戳欄（active 的 Update；recurringExpenses 的 CreatedAt / UpdatedAt）：
  // 正常寫入的會顯示為 'yyyy-MM-dd HH:mm:ss'；以 Date 寫入的會依試算表時區與地區
  // 顯示成其他格式（如 10/29/2026 9:56:35），改寫為腳本時區的字串。
  var stampTargets = [
    { name: ACTIVE_SHEET_NAME,     cols: [11] },
    { name: RECURRING_SHEET_NAME_, cols: [19, 20] }
  ];
  stampTargets.forEach(function (t) {
    var sheet = doc.getSheetByName(t.name);
    if (!sheet || sheet.getLastRow() < 2) return;
    var numRows = sheet.getLastRow() - 1;
    t.cols.forEach(function (col) {
      var range    = sheet.getRange(2, col, numRows, 1);
      var values   = range.getValues();
      var displays = range.getDisplayValues();
      for (var i = 0; i < values.length; i++) {
        var v = values[i][0];
        if (!(v instanceof Date)) continue;
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(displays[i][0])) continue;
        var intended = Utilities.formatDate(v, scriptTz, 'yyyy-MM-dd HH:mm:ss');
        Logger.log(t.name + ' 第 ' + (i + 2) + ' 列 第 ' + col + ' 欄：' + displays[i][0] + ' → ' + intended);
        if (apply) sheet.getRange(i + 2, col).setValue(intended);
        count++;
      }
    });
  });

  Logger.log((apply ? '已修正 ' : '找到 ') + count + ' 個儲存格');
}

/** 煙霧測試：透過 doGet 讀取 config 分頁 A1:C1，結果寫入執行紀錄。 */
function testRangeRead() {
  var token = PropertiesService.getScriptProperties().getProperty(API_TOKEN_PROP);
  if (!token) throw new Error('先執行 setApiToken()');
  var out = doGet({ parameter: {
    token: token, sheetTag: 'config', row: 1, col: 1, endRow: 1, endCol: 3
  } });
  Logger.log(out.getContent());
}
