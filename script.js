'use strict';

// ── Google Apps Script endpoints (injected from config.js) ───────────────────
const scriptWriteUrl = APP_CONFIG.scriptWriteUrl;
const scriptReadUrl  = APP_CONFIG.scriptReadUrl;

// ── Category data ─────────────────────────────────────────────────────────────
const topclass = [
    [],
    ['薪資', '利息', '獎金', '投資', '販賣', '租金', '還款', '其他'],
    ['飲食', '衣裝', '居住', '交通', '教育', '娛樂', '健康', '社交', '其他']
];

const subclass = [
    ['早餐', '午餐', '晚餐', '食材', '水果', '零食', '飲料'],
    ['衣服', '鞋子', '包包', '配件', '理髮', '美容'],
    ['房租', '水費', '電費', '瓦斯費', '網路費', '生活消耗品', '家電', '家具', '生活物品', '維修費'],
    ['汽油燃料', '維修保養', '火車高鐵', '捷運', '公車/客運', '計程車', '飛機', '公共租借', '停車費', '過路費', '汽車用品', '交通卡'],
    ['文具', '書籍', '材料', '課程學費', '教具'],
    ['手機費', '3C產品', '旅宿', '門票', '遊戲', '電影', '數位服務', '國外旅遊', '飾品'],
    ['門診', '手術', '藥品', '醫療用品', '運動', '保健食品', '自費項目'],
    ['捐款', '孝親費', '交際', '貸出'],
    ['貸款', '稅務', '罰單', '保險', '手續費', '其他']
];

const stars = ['', '☆☆☆☆☆', '☆☆☆☆★', '☆☆☆★★', '☆☆★★★', '☆★★★★', '★★★★★'];

// ── Budget data (fetched from Google Sheets) ──────────────────────────────────
var arrBudget = [];
var arrUsed = [];

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildOptions(arr) {
    return arr.map(item => '<option>' + item + '</option>').join('');
}

// ── Event handlers (called from inline HTML onchange / onclick) ───────────────
function changeBalance(index) {
    document.getElementById('topclass-list').innerHTML = buildOptions(topclass[index]);

    var tindex = document.getElementById('topclass-list').selectedIndex;
    var bindex = document.getElementById('balance-list').selectedIndex;
    document.getElementById('subclass-list').innerHTML = bindex < 2 ? '' : buildOptions(subclass[tindex]);
    document.getElementById('budget').innerHTML = bindex === 2 ? DisplayBudgetRemain(tindex) : '';
}

function changeTopclass() {
    var index  = document.getElementById('topclass-list').selectedIndex;
    var bindex = document.getElementById('balance-list').selectedIndex;
    document.getElementById('subclass-list').innerHTML = bindex < 2 ? '' : buildOptions(subclass[index]);
    document.getElementById('budget').innerHTML = bindex === 2 ? DisplayBudgetRemain(index) : '';
}

function changeDate() {
    var month = document.getElementById('fdate').valueAsDate.getMonth() + 1;
    document.getElementById('month').value = month;
}

function DisplayBudgetRemain(idx) {
    const money = new Intl.NumberFormat('tw-TW', { style: 'currency', currency: 'NTD', minimumFractionDigits: 0 });
    var curUsage   = arrUsed[idx]   ? arrUsed[idx][1]   : 0;
    var yearBudget = arrBudget[idx] ? arrBudget[idx][1] : 0;
    var remain = yearBudget - curUsage;
    document.getElementById('budget').style.color = remain <= 0 ? 'red' : 'green';
    return '剩餘: ' + money.format(remain) + ' (預算: ' + money.format(yearBudget) + ', 已使用: ' + money.format(curUsage) + ')';
}

function OnReset() {
    document.getElementById('fdate').valueAsDate = new Date();
    document.getElementById('topclass-list').innerHTML = '';
    document.getElementById('subclass-list').innerHTML = '';
}

// ── Initialization (script has defer, so DOM is ready here) ───────────────────
document.getElementById('fdate').valueAsDate = new Date();
changeDate();

document.getElementById('balance-list').innerHTML = buildOptions(['請選擇', '收入', '支出']);
document.getElementById('star-list').innerHTML    = buildOptions(stars);

// Form submission
var form = document.forms['submit-to-google-sheet'];
form.addEventListener('submit', e => {
    e.preventDefault();
    var txtStore  = document.getElementById('store').value;
    var txtDetail = document.getElementById('detail').value;
    if (!txtStore && !txtDetail) {
        alert('請輸入店家/項目內容');
        return;
    }
    fetch(scriptWriteUrl, { method: 'POST', body: new FormData(form) })
        .then(() => alert('Success!'))
        .catch(error => alert('Error! ' + error.message));
});

// Fetch budget data from Google Sheets
$(function () {
    var budgets = {
        sheetUrl: 'https://docs.google.com/spreadsheets/d/1ZNPbB2IAaM23TGnwfXr4bTbijXXBPwMMNTZa_O5ERhE/edit?pli=1#gid=1968068763',
        sheetTag: 'annualBudget',
        row: 1, col: 1, endRow: 9, endCol: 2
    };
    $.get(scriptReadUrl, budgets, function (data) {
        var d = data.split(',');
        for (var i = 0; i < (budgets.endRow - budgets.row + 1); i++) {
            arrBudget[i] = d.splice(0, budgets.endCol - budgets.col + 1);
        }
    });

    var nowusing = {
        sheetUrl: 'https://docs.google.com/spreadsheets/d/1ZNPbB2IAaM23TGnwfXr4bTbijXXBPwMMNTZa_O5ERhE/edit?pli=1#gid=1968068763',
        sheetTag: new Date().getFullYear(),
        row: 11, col: 2, endRow: 19, endCol: 3
    };
    $.get(scriptReadUrl, nowusing, function (data) {
        var d = data.split(',');
        for (var i = 0; i < (nowusing.endRow - nowusing.row + 1); i++) {
            arrUsed[i] = d.splice(0, nowusing.endCol - nowusing.col + 1);
        }
    });
});
