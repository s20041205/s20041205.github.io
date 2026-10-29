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

/** 煙霧測試：透過 doGet 讀取 config 分頁 A1:C1，結果寫入執行紀錄。 */
function testRangeRead() {
  var token = PropertiesService.getScriptProperties().getProperty(API_TOKEN_PROP);
  if (!token) throw new Error('先執行 setApiToken()');
  var out = doGet({ parameter: {
    token: token, sheetTag: 'config', row: 1, col: 1, endRow: 1, endCol: 3
  } });
  Logger.log(out.getContent());
}
