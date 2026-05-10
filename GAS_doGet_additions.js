// =============================================================================
// 完整整合版 doGet — 直接貼入 GAS，取代原本的 doGet 函式
// 部署後記得：Deploy → Manage deployments → New version
// =============================================================================

function doGet(e) {
  var params = e.parameter;

  // ── 取得近期記錄 ───────────────────────────────────────────────────────────
  if (params.action === 'recentRecords') {
    var count   = parseInt(params.count) || 20;
    var doc     = SpreadsheetApp.openByUrl(params.sheetUrl);
    var sheet   = doc.getSheetByName('active');
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return ContentService.createTextOutput('[]')
        .setMimeType(ContentService.MimeType.JSON);
    }
    var firstRow = Math.max(2, lastRow - count + 1);
    var numRows  = lastRow - firstRow + 1;
    var values   = sheet.getRange(firstRow, 1, numRows, 12).getValues();

    var result = [];
    for (var i = values.length - 1; i >= 0; i--) {
      var r   = values[i];
      var raw = r[0];
      var dateStr = '';
      if (raw instanceof Date) {
        dateStr = raw.getFullYear() + '-' +
                  String(raw.getMonth() + 1).padStart(2, '0') + '-' +
                  String(raw.getDate()).padStart(2, '0');
      } else {
        dateStr = String(raw).substring(0, 10);
      }
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

  // ── 支出細項彙整 ──────────────────────────────────────────────────────────
  if (params.action === 'subSummary') {
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
        : (parseInt(String(dateVal).substring(5, 7)) - 1);

      if (!result[topclass]) result[topclass] = {};
      if (!result[topclass][subclass]) result[topclass][subclass] = { total: 0, monthly: [0,0,0,0,0,0,0,0,0,0,0,0] };
      result[topclass][subclass].total += price;
      if (month >= 0 && month < 12) result[topclass][subclass].monthly[month] += price;
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── 標記彙整 ───────────────────────────────────────────────────────────────
  if (params.action === 'tagSummary') {
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
  if (params.action === 'updateRecord') {
    var rowNum = parseInt(params.rowNum);
    if (!rowNum || rowNum < 2) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'error', msg: 'invalid rowNum' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var doc   = SpreadsheetApp.openByUrl(params.sheetUrl);
    var sheet = doc.getSheetByName('active');

    if (params.Date) {
      var parts   = params.Date.split('-');
      var dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      sheet.getRange(rowNum, 1).setValue(dateObj);
      sheet.getRange(rowNum, 2).setValue(parseInt(parts[1]));  // Month 自動同步
    }
    if (params.Balance)               sheet.getRange(rowNum,  3).setValue(params.Balance);
    if (params.Topclass)              sheet.getRange(rowNum,  4).setValue(params.Topclass);
    if (params.Subclass !== undefined) sheet.getRange(rowNum,  5).setValue(params.Subclass);
    if (params.Price)                 sheet.getRange(rowNum,  6).setValue(parseFloat(params.Price) || 0);
    if (params.Store  !== undefined)  sheet.getRange(rowNum,  7).setValue(params.Store);
    if (params.Detail !== undefined)  sheet.getRange(rowNum,  8).setValue(params.Detail);
    if (params.Recommendation)        sheet.getRange(rowNum,  9).setValue(params.Recommendation);
    if (params.Name)                  sheet.getRange(rowNum, 10).setValue(params.Name);
    if (params.Tag !== undefined)     sheet.getRange(rowNum, 12).setValue(params.Tag);
    // Update（col 11）不修改，保留原始寫入時間戳

    return ContentService.createTextOutput(JSON.stringify({ result: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── 刪除記錄 ───────────────────────────────────────────────────────────────
  if (params.action === 'deleteRecord') {
    var rowNum = parseInt(params.rowNum);
    if (!rowNum || rowNum < 2) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'error', msg: 'invalid rowNum' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var doc   = SpreadsheetApp.openByUrl(params.sheetUrl);
    var sheet = doc.getSheetByName('active');
    sheet.deleteRow(rowNum);

    return ContentService.createTextOutput(JSON.stringify({ result: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── 原始範圍讀取邏輯（未修改）─────────────────────────────────────────────
  var sheetUrl = params.sheetUrl;
  var sheetTag = params.sheetTag;
  var row    = params.row;
  var col    = params.col;
  var endRow = params.endRow;
  var endCol = params.endCol;
  var rowRange = endRow - row + 1;
  var colRange = endCol - col + 1;

  var SpreadSheet = SpreadsheetApp.openByUrl(sheetUrl);
  var Sheet = SpreadSheet.getSheetByName(sheetTag);

  var lastRow = Sheet.getLastRow();
  var lastCol = Sheet.getLastColumn();

  if (rowRange > lastRow) {
    rowRange = lastRow;
  }

  if (colRange > lastCol) {
    colRange = lastCol;
  }

  var data = Sheet.getSheetValues(row, col, rowRange, colRange);

  return ContentService.createTextOutput(data);
}
