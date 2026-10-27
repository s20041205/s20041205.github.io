/**
 * 週期性花費（訂閱、定期支出）。
 *
 * 一次性設定（於 Apps Script 編輯器執行）：
 *   1. Script Property BOOKKEEPING_SPREADSHEET_ID 設為目標試算表 ID（或執行 initialSetup()）。
 *   2. 執行 setupRecurringExpenses()：建立 `recurringExpenses` 分頁、
 *      在 `active` 補上 `RecurringKey` 欄、安裝每日觸發器 processRecurringExpenses()。
 *
 * doGet action：recurringExpenses / saveRecurringExpense /
 *               setRecurringExpenseActive / deleteRecurringExpense / runRecurringExpenses
 *
 * 前端 UI：recurring.html。
 */

'use strict';

var RECURRING_SHEET_NAME_ = 'recurringExpenses';
var RECURRING_TRIGGER_HANDLER_ = 'processRecurringExpenses';
var RECURRING_HEADERS_ = [
  'Id', 'Service', 'Website', 'Price', 'Topclass', 'Subclass', 'Store', 'Detail',
  'Recommendation', 'Name', 'Tag', 'Frequency', 'Interval', 'StartDate',
  'NextDate', 'EndDate', 'Active', 'LastRunDate', 'CreatedAt', 'UpdatedAt'
];
var RECURRING_TOPCLASSES_ = ['飲食', '衣裝', '居住', '交通', '教育', '娛樂', '健康', '社交', '其他'];
var RECURRING_SUBCLASSES_ = {
  '飲食': ['早餐', '午餐', '晚餐', '食材', '零食', '飲料', '外送費'],
  '衣裝': ['衣服', '鞋子', '包包', '配件', '理髮', '美容'],
  '居住': ['房租', '水費', '電費', '瓦斯費', '網路費', '手機費', '日用品', '家電', '家具', '維修費', '管理費'],
  '交通': ['汽油燃料', '維修保養', '火車高鐵', '捷運', '公車/客運', '計程車', '飛機', '公共租借', '停車費', '過路費', '汽車用品', '交通卡'],
  '教育': ['文具', '書籍', '耗材/材料', '課程學費', '教具'],
  '娛樂': ['3C產品', '旅宿', '門票', '遊戲', '電影', '數位服務', '國外旅遊', '模型/收藏品', '玩具', '相片/相冊'],
  '健康': ['門診', '手術', '住院/療養', '藥品', '醫療用品', '運動', '保健食品', '疫苗'],
  '社交': ['捐款', '孝親費', '交際', '貸出', '禮金/禮物'],
  '其他': ['貸款', '稅務', '罰單', '保險', '手續費', '其他']
};
var RECURRING_RECOMMENDATIONS_ = ['-', '☆☆☆☆☆', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★'];

function setupRecurringExpenses() {
  var doc = getBookkeepingSpreadsheet_();
  PropertiesService.getScriptProperties()
    .setProperty(SPREADSHEET_ID_PROP, doc.getId());
  ensureRecurringSheet_(doc);
  ensureRecurringKeyColumn_(doc);
  installRecurringExpenseTrigger_();
  return {
    result: 'ok',
    sheet: RECURRING_SHEET_NAME_,
    trigger: RECURRING_TRIGGER_HANDLER_
  };
}

function installRecurringExpenseTrigger_() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === RECURRING_TRIGGER_HANDLER_) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger(RECURRING_TRIGGER_HANDLER_)
    .timeBased()
    .atHour(3)
    .nearMinute(15)
    .everyDays(1)
    .create();
}

function hasRecurringExpenseTrigger_() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === RECURRING_TRIGGER_HANDLER_) return true;
    }
  } catch (err) {
    return false;
  }
  return false;
}

function ensureRecurringSheet_(doc) {
  var sheet = doc.getSheetByName(RECURRING_SHEET_NAME_);
  if (!sheet) {
    sheet = doc.insertSheet(RECURRING_SHEET_NAME_);
    sheet.getRange(1, 1, 1, RECURRING_HEADERS_.length).setValues([RECURRING_HEADERS_]);
    sheet.setFrozenRows(1);
    sheet.getRange('D:D').setNumberFormat('#,##0.00');
    sheet.getRange('N:P').setNumberFormat('yyyy-mm-dd');
    sheet.getRange('R:R').setNumberFormat('yyyy-mm-dd');
    return sheet;
  }

  var currentHeaders = sheet.getRange(1, 1, 1, RECURRING_HEADERS_.length).getValues()[0];
  var isBlank = currentHeaders.every(function (value) { return !value; });
  if (isBlank) {
    sheet.getRange(1, 1, 1, RECURRING_HEADERS_.length).setValues([RECURRING_HEADERS_]);
  } else {
    for (var i = 0; i < RECURRING_HEADERS_.length; i++) {
      if (String(currentHeaders[i]) !== RECURRING_HEADERS_[i]) {
        throw new Error('Unexpected recurringExpenses schema at column ' + (i + 1));
      }
    }
  }
  return sheet;
}

function ensureRecurringKeyColumn_(doc) {
  var sheet = doc.getSheetByName('active');
  if (!sheet) throw new Error('Missing active sheet');
  var lastColumn = Math.max(sheet.getLastColumn(), 12);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(function (value) { return String(value); });
  var index = headers.indexOf('RecurringKey');
  if (index >= 0) return index + 1;
  var column = lastColumn + 1;
  sheet.getRange(1, column).setValue('RecurringKey');
  return column;
}

function parseBoolean_(value) {
  return value === true || String(value).toLowerCase() === 'true' || String(value) === '1';
}

function cleanRecurringText_(value, maxLength, required) {
  var text = String(value == null ? '' : value).trim();
  if (required && !text) throw new Error('Missing required text');
  if (text.length > maxLength) throw new Error('Text is too long');
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

function parseDateOnly_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value == null ? '' : value).trim());
  if (!match) return null;
  var year = Number(match[1]);
  var month = Number(match[2]);
  var day = Number(match[3]);
  var result = new Date(year, month - 1, day);
  if (year < 1000 || result.getFullYear() !== year
      || result.getMonth() !== month - 1 || result.getDate() !== day) return null;
  return result;
}

function dateOnlyString_(value) {
  var date = parseDateOnly_(value);
  if (!date) return '';
  return date.getFullYear() + '-'
    + String(date.getMonth() + 1).padStart(2, '0') + '-'
    + String(date.getDate()).padStart(2, '0');
}

function validateRecurringParams_(params) {
  var service = cleanRecurringText_(params.Service, 80, true);
  var website = cleanRecurringText_(params.Website, 500, false);
  if (website && !/^https?:\/\/[^\s]+$/i.test(website)) throw new Error('Invalid website');

  var price = Number(params.Price);
  if (!isFinite(price) || price <= 0) throw new Error('Invalid price');

  var topclass = String(params.Topclass || '');
  if (RECURRING_TOPCLASSES_.indexOf(topclass) < 0) throw new Error('Invalid topclass');
  var subclass = String(params.Subclass || '');
  if (RECURRING_SUBCLASSES_[topclass].indexOf(subclass) < 0) throw new Error('Invalid subclass');

  var recommendation = String(params.Recommendation || '-');
  if (RECURRING_RECOMMENDATIONS_.indexOf(recommendation) < 0) throw new Error('Invalid recommendation');
  var name = String(params.Name || '');
  if (['Jerry_Hu', 'Alice_Lin'].indexOf(name) < 0) throw new Error('Invalid name');
  var frequency = String(params.Frequency || '');
  if (['weekly', 'monthly', 'yearly'].indexOf(frequency) < 0) throw new Error('Invalid frequency');
  var interval = Number(params.Interval);
  if (!isFinite(interval) || interval < 1 || interval > 60 || Math.floor(interval) !== interval) {
    throw new Error('Invalid interval');
  }

  var startDate = parseDateOnly_(params.StartDate);
  var nextDate = parseDateOnly_(params.NextDate);
  var endDate = params.EndDate ? parseDateOnly_(params.EndDate) : null;
  if (!startDate || !nextDate || (params.EndDate && !endDate)) throw new Error('Invalid date');
  if (endDate && endDate.getTime() < nextDate.getTime()) throw new Error('End date is before next date');

  return {
    service: service,
    website: website,
    price: price,
    topclass: topclass,
    subclass: subclass,
    store: cleanRecurringText_(params.Store, 100, false),
    detail: cleanRecurringText_(params.Detail, 200, false),
    recommendation: recommendation,
    name: name,
    tag: cleanRecurringText_(params.Tag, 30, false),
    frequency: frequency,
    interval: interval,
    startDate: startDate,
    nextDate: nextDate,
    endDate: endDate,
    active: parseBoolean_(params.Active)
  };
}

function findRecurringRowById_(sheet, id) {
  if (!id || sheet.getLastRow() < 2) return 0;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === id) return i + 2;
  }
  return 0;
}

function saveRecurringExpense_(doc, params) {
  var data = validateRecurringParams_(params);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = ensureRecurringSheet_(doc);
    ensureRecurringKeyColumn_(doc);
    var id = String(params.Id || '').trim();
    var rowNum = id ? findRecurringRowById_(sheet, id) : 0;
    if (id && !rowNum) throw new Error('Recurring expense not found');

    var now = new Date();
    var existing = rowNum
      ? sheet.getRange(rowNum, 1, 1, RECURRING_HEADERS_.length).getValues()[0]
      : null;
    if (!id) id = Utilities.getUuid();
    var row = [
      id, data.service, data.website, data.price, data.topclass, data.subclass,
      data.store, data.detail, data.recommendation, data.name, data.tag,
      data.frequency, data.interval, data.startDate, data.nextDate,
      data.endDate || '', data.active, existing ? existing[17] : '',
      existing ? existing[18] : now, now
    ];

    if (rowNum) {
      sheet.getRange(rowNum, 1, 1, RECURRING_HEADERS_.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
    return { result: 'ok', id: id };
  } finally {
    lock.releaseLock();
  }
}

function setRecurringExpenseActive_(doc, params) {
  var id = String(params.Id || '').trim();
  if (!id) throw new Error('Missing recurring expense ID');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = ensureRecurringSheet_(doc);
    var rowNum = findRecurringRowById_(sheet, id);
    if (!rowNum) throw new Error('Recurring expense not found');
    sheet.getRange(rowNum, 17).setValue(parseBoolean_(params.Active));
    sheet.getRange(rowNum, 20).setValue(new Date());
    return { result: 'ok' };
  } finally {
    lock.releaseLock();
  }
}

function deleteRecurringExpense_(doc, params) {
  var id = String(params.Id || '').trim();
  if (!id) throw new Error('Missing recurring expense ID');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = ensureRecurringSheet_(doc);
    var rowNum = findRecurringRowById_(sheet, id);
    if (!rowNum) throw new Error('Recurring expense not found');
    sheet.deleteRow(rowNum);
    return { result: 'ok' };
  } finally {
    lock.releaseLock();
  }
}

function listRecurringExpenses_(doc) {
  var sheet = doc.getSheetByName(RECURRING_SHEET_NAME_);
  var items = [];
  if (sheet && sheet.getLastRow() >= 2) {
    var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, RECURRING_HEADERS_.length).getValues();
    items = values
      .filter(function (row) { return Boolean(row[0]); })
      .map(serializeRecurringRow_)
      .sort(function (a, b) {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return String(a.nextDate).localeCompare(String(b.nextDate));
      });
  }
  return { items: items, automationEnabled: hasRecurringExpenseTrigger_() };
}

function serializeRecurringRow_(row) {
  return {
    id: String(row[0] || ''),
    service: String(row[1] || ''),
    website: String(row[2] || ''),
    price: Number(row[3]) || 0,
    topclass: String(row[4] || ''),
    subclass: String(row[5] || ''),
    store: String(row[6] || ''),
    detail: String(row[7] || ''),
    recommendation: String(row[8] || '-'),
    name: String(row[9] || ''),
    tag: String(row[10] || ''),
    frequency: String(row[11] || ''),
    interval: Number(row[12]) || 1,
    startDate: dateOnlyString_(row[13]),
    nextDate: dateOnlyString_(row[14]),
    endDate: dateOnlyString_(row[15]),
    active: parseBoolean_(row[16]),
    lastRunDate: dateOnlyString_(row[17])
  };
}

function daysInMonth_(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function nextRecurringDate_(startDateValue, dueDateValue, frequency, intervalValue) {
  var startDate = parseDateOnly_(startDateValue);
  var dueDate = parseDateOnly_(dueDateValue);
  var interval = Number(intervalValue);
  if (!startDate || !dueDate || !isFinite(interval) || interval < 1) {
    throw new Error('Invalid recurrence calculation');
  }

  if (frequency === 'weekly') {
    return new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate() + (7 * interval));
  }

  if (frequency === 'monthly') {
    var firstOfTargetMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + interval, 1);
    var monthlyDay = Math.min(
      startDate.getDate(),
      daysInMonth_(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth())
    );
    return new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth(), monthlyDay);
  }

  if (frequency === 'yearly') {
    var targetYear = dueDate.getFullYear() + interval;
    var yearlyDay = Math.min(startDate.getDate(), daysInMonth_(targetYear, startDate.getMonth()));
    return new Date(targetYear, startDate.getMonth(), yearlyDay);
  }

  throw new Error('Invalid recurrence frequency');
}

function loadRecurringKeys_(activeSheet, keyColumn) {
  var keys = {};
  if (activeSheet.getLastRow() < 2) return keys;
  var values = activeSheet.getRange(2, keyColumn, activeSheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    var key = String(values[i][0] || '');
    if (key) keys[key] = true;
  }
  return keys;
}

function activeHeaderMap_(sheet) {
  var lastColumn = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) map[String(headers[i])] = i;
  ['Date', 'Month', 'Balance', 'Topclass', 'Subclass', 'Price', 'Store', 'Detail',
    'Recommendation', 'Name', 'Update', 'Tag', 'RecurringKey'].forEach(function (header) {
      if (map[header] === undefined) throw new Error('Missing active header: ' + header);
    });
  return { headers: headers, map: map };
}

function appendRecurringEntry_(activeSheet, recurring, dueDate, recurringKey, now) {
  var layout = activeHeaderMap_(activeSheet);
  var row = new Array(layout.headers.length).fill('');
  row[layout.map.Date] = dueDate;
  row[layout.map.Month] = dueDate.getMonth() + 1;
  row[layout.map.Balance] = '支出';
  row[layout.map.Topclass] = String(recurring[4] || '');
  row[layout.map.Subclass] = String(recurring[5] || '');
  row[layout.map.Price] = Number(recurring[3]) || 0;
  row[layout.map.Store] = String(recurring[6] || recurring[1] || '');
  row[layout.map.Detail] = String(recurring[7] || recurring[1] || '');
  row[layout.map.Recommendation] = String(recurring[8] || '-');
  row[layout.map.Name] = String(recurring[9] || '');
  row[layout.map.Update] = now;
  row[layout.map.Tag] = String(recurring[10] || '');
  row[layout.map.RecurringKey] = recurringKey;
  activeSheet.appendRow(row);
}

function processRecurringExpenses() {
  return processRecurringExpensesForDate_(new Date());
}

function processRecurringExpensesForDate_(todayValue) {
  var doc = getBookkeepingSpreadsheet_();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var recurringSheet = ensureRecurringSheet_(doc);
    var keyColumn = ensureRecurringKeyColumn_(doc);
    var activeSheet = doc.getSheetByName('active');
    var today = parseDateOnly_(todayValue);
    if (!today) throw new Error('Invalid processing date');

    var stats = { result: 'ok', posted: 0, skipped: 0, capped: 0 };
    if (recurringSheet.getLastRow() < 2) return stats;

    var values = recurringSheet
      .getRange(2, 1, recurringSheet.getLastRow() - 1, RECURRING_HEADERS_.length)
      .getValues();
    var existingKeys = loadRecurringKeys_(activeSheet, keyColumn);
    var now = new Date();

    for (var i = 0; i < values.length; i++) {
      var recurring = values[i];
      if (!recurring[0] || !parseBoolean_(recurring[16])) continue;

      var startDate = parseDateOnly_(recurring[13]);
      var nextDate = parseDateOnly_(recurring[14]);
      var endDate = recurring[15] ? parseDateOnly_(recurring[15]) : null;
      if (!startDate || !nextDate) continue;

      var processed = 0;
      var lastRunDate = null;
      var active = true;
      while (nextDate.getTime() <= today.getTime()
          && (!endDate || nextDate.getTime() <= endDate.getTime())
          && processed < 120) {
        var dueDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
        var recurringKey = String(recurring[0]) + '|' + dateOnlyString_(dueDate);
        if (existingKeys[recurringKey]) {
          stats.skipped++;
        } else {
          appendRecurringEntry_(activeSheet, recurring, dueDate, recurringKey, now);
          existingKeys[recurringKey] = true;
          stats.posted++;
        }
        processed++;
        lastRunDate = dueDate;
        nextDate = nextRecurringDate_(startDate, dueDate, String(recurring[11]), Number(recurring[12]));
      }

      if (processed === 120 && nextDate.getTime() <= today.getTime()) stats.capped++;
      if (endDate && nextDate.getTime() > endDate.getTime()) active = false;
      if (processed || !active) {
        var rowNum = i + 2;
        recurringSheet.getRange(rowNum, 15).setValue(nextDate);
        recurringSheet.getRange(rowNum, 17).setValue(active);
        if (lastRunDate) recurringSheet.getRange(rowNum, 18).setValue(lastRunDate);
        recurringSheet.getRange(rowNum, 20).setValue(now);
      }
    }
    return stats;
  } finally {
    lock.releaseLock();
  }
}
