'use strict';

// ── Google Apps Script endpoints (injected from config.js) ───────────────────
const scriptWriteUrl = APP_CONFIG.scriptWriteUrl;
const scriptReadUrl  = APP_CONFIG.scriptReadUrl;

// ── Category data ─────────────────────────────────────────────────────────────
const topclass = [
    [],
    ['薪資', '利息', '獎金', '投資', '販賣', '租金', '還款', '副業/兼職', '退稅/補助', '其他'],
    ['飲食', '衣裝', '居住', '交通', '教育', '娛樂', '健康', '社交', '其他']
];

const subclass = [
    ['早餐', '午餐', '晚餐', '食材', '零食', '飲料', '外送費'],
    ['衣服', '鞋子', '包包', '配件', '理髮', '美容'],
    ['房租', '水費', '電費', '瓦斯費', '網路費', '手機費', '日用品', '家電', '家具', '維修費', '管理費'],
    ['汽油燃料', '維修保養', '火車高鐵', '捷運', '公車/客運', '計程車', '飛機', '公共租借', '停車費', '過路費', '汽車用品', '交通卡'],
    ['文具', '書籍', '耗材/材料', '課程學費', '教具'],
    ['3C產品', '旅宿', '門票', '遊戲', '電影', '數位服務', '國外旅遊', '模型/收藏品', '玩具', '相片/相冊'],
    ['門診', '手術', '住院/療養', '藥品', '醫療用品', '運動', '保健食品', '疫苗'],
    ['捐款', '孝親費', '交際', '貸出', '禮金/禮物'],
    ['貸款', '稅務', '罰單', '保險', '手續費', '其他']
];

const stars = ['-', '☆☆☆☆☆', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★'];

// ── Budget data (fetched from Google Sheets) ──────────────────────────────────
var arrBudget = [];
var arrUsed = [];
var budgetReady = false;
var arrActivities = [];

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildOptions(arr) {
    return arr.map(item => '<option>' + item + '</option>').join('');
}

// ── Autocomplete (localStorage) ───────────────────────────────────────────────
const AC_KEY = 'bookkeeping_ac';
const AC_MAX = 50;

function loadAutocomplete() {
    var data = JSON.parse(localStorage.getItem(AC_KEY) || '{"stores":[],"details":[]}');
    document.getElementById('store-suggestions').innerHTML  = data.stores.map(v => '<option value="' + v + '">').join('');
    document.getElementById('detail-suggestions').innerHTML = data.details.map(v => '<option value="' + v + '">').join('');
}

function saveAutocomplete(store, detail) {
    var data = JSON.parse(localStorage.getItem(AC_KEY) || '{"stores":[],"details":[]}');
    if (store  && !data.stores.includes(store))   { data.stores.unshift(store);   data.stores  = data.stores.slice(0, AC_MAX); }
    if (detail && !data.details.includes(detail)) { data.details.unshift(detail); data.details = data.details.slice(0, AC_MAX); }
    localStorage.setItem(AC_KEY, JSON.stringify(data));
    loadAutocomplete();
}

function clearAutocomplete() {
    localStorage.removeItem(AC_KEY);
    loadAutocomplete();
    showMessage('已清除店家／項目建議記錄', 'success');
}

function showMessage(msg, type) {
    var el = document.getElementById('msg-alert');
    el.className = 'alert alert-' + type;
    el.textContent = msg;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.className = 'alert d-none'; }, 3000);
}

// ── Event handlers (called from inline HTML onchange / onclick) ───────────────
function changeBalance(index) {
    const topEl = document.getElementById('topclass-list');
    const subEl = document.getElementById('subclass-list');

    topEl.innerHTML = buildOptions(topclass[index]);
    topEl.hidden = topclass[index].length === 0;

    const tindex = topEl.selectedIndex;
    subEl.innerHTML = index < 2 ? '' : buildOptions(subclass[tindex]);
    subEl.hidden = index < 2;

    document.getElementById('budget').innerHTML = index === 2 ? DisplayBudgetRemain(tindex) : '';
}

function changeTopclass() {
    const index  = document.getElementById('topclass-list').selectedIndex;
    const bindex = document.getElementById('balance-list').selectedIndex;
    const subEl  = document.getElementById('subclass-list');
    subEl.innerHTML = bindex < 2 ? '' : buildOptions(subclass[index]);
    subEl.hidden = bindex < 2;
    document.getElementById('budget').innerHTML = bindex === 2 ? DisplayBudgetRemain(index) : '';
}

function todayString() {
    var d = new Date();
    return d.getFullYear() + '-'
        + String(d.getMonth() + 1).padStart(2, '0') + '-'
        + String(d.getDate()).padStart(2, '0');
}

function changeDate() {
    var val = document.getElementById('fdate').value; // "YYYY-MM-DD"
    document.getElementById('month').value = parseInt(val.split('-')[1], 10);
}

function DisplayBudgetRemain(idx) {
    var el = document.getElementById('budget');
    if (!budgetReady) {
        el.style.color = 'gray';
        return '預算載入中...';
    }
    const money = new Intl.NumberFormat('tw-TW', { style: 'currency', currency: 'NTD', minimumFractionDigits: 0 });
    var curUsage   = arrUsed[idx]   ? arrUsed[idx][1]   : 0;
    var yearBudget = arrBudget[idx] ? arrBudget[idx][1] : 0;
    var remain = yearBudget - curUsage;
    el.style.color = remain <= 0 ? 'red' : 'green';
    return '剩餘: ' + money.format(remain) + ' (預算: ' + money.format(yearBudget) + ', 已使用: ' + money.format(curUsage) + ')';
}

function refreshBudgetDisplay() {
    var bindex = document.getElementById('balance-list').selectedIndex;
    if (bindex === 2) {
        var tindex = document.getElementById('topclass-list').selectedIndex;
        document.getElementById('budget').innerHTML = DisplayBudgetRemain(tindex);
    }
}

function clearEntryFields() {
    document.getElementById('price').value = '';
    document.getElementById('store').value = '';
    document.getElementById('detail').value = '';
    document.getElementById('star-list').selectedIndex = 0;
    form.querySelector('[name=Tag]').value = '';
    document.getElementById('price').focus();
}

function OnReset() {
    cancelAddActivity();
    document.getElementById('fdate').value = todayString();
    changeDate();
    document.getElementById('balance-list').selectedIndex = 0;
    const topEl = document.getElementById('topclass-list');
    const subEl = document.getElementById('subclass-list');
    topEl.innerHTML = ''; topEl.hidden = true;
    subEl.innerHTML = ''; subEl.hidden = true;
    document.getElementById('budget').innerHTML = '';
    document.getElementById('price').value = '';
    document.getElementById('store').value = '';
    document.getElementById('detail').value = '';
    document.getElementById('star-list').selectedIndex = 0;
    form.querySelector('[name=Tag]').value = '';
}

// ── Initialization (script has defer, so DOM is ready here) ───────────────────
document.getElementById('year').textContent = new Date().getFullYear();
document.getElementById('sheet-link').href  = APP_CONFIG.sheetUrl;
document.getElementById('fdate').value = todayString();
changeDate();

document.getElementById('balance-list').innerHTML = buildOptions(['請選擇', '收入', '支出']);
document.getElementById('star-list').innerHTML    = buildOptions(stars);
document.getElementById('topclass-list').hidden   = true;
document.getElementById('subclass-list').hidden   = true;
loadAutocomplete();

// Form submission
var form = document.forms['submit-to-google-sheet'];
form.addEventListener('submit', e => {
    e.preventDefault();
    var txtStore  = document.getElementById('store').value;
    var txtDetail = document.getElementById('detail').value;
    if (!txtStore && !txtDetail) {
        showMessage('請輸入店家/項目內容', 'warning');
        return;
    }

    var btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.textContent = '傳送中...';

    // no-cors: Google Apps Script returns a cross-origin redirect after writing;
    // reading that response would throw a CORS error even though the write succeeded.
    fetch(scriptWriteUrl, { method: 'POST', body: new FormData(form), mode: 'no-cors' })
        .then(() => {
            saveAutocomplete(
                document.getElementById('store').value,
                document.getElementById('detail').value
            );
            showMessage('送出成功！', 'success');
            clearEntryFields();
        })
        .catch(() => {
            var msg = navigator.onLine ? '送出失敗，請稍後再試' : '網路連線已中斷，請確認後重試';
            showMessage(msg, 'danger');
        })
        .finally(() => {
            btn.disabled = false;
            btn.textContent = 'Send';
        });
});

// Fetch budget data from Google Sheets
const budgets = {
    sheetUrl: APP_CONFIG.sheetUrl,
    sheetTag: 'config',
    row: 2, col: 1, endRow: 10, endCol: 2
};
const nowusing = {
    sheetUrl: APP_CONFIG.sheetUrl,
    sheetTag: new Date().getFullYear(),
    row: 11, col: 2, endRow: 19, endCol: 3
};
const activityParams = {
    sheetUrl: APP_CONFIG.sheetUrl,
    sheetTag: 'config',
    row: 2, col: 5, endRow: 51, endCol: 5
};

function fetchSheet(params) {
    const url = new URL(scriptReadUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return fetch(url).then(r => r.text());
}

// Activities with YYMMDD_ prefix expire after this many days
var ACTIVITY_EXPIRE_DAYS = 30;

function activityEventDate(raw) {
    var m = raw.match(/^(\d{2})(\d{2})(\d{2})_/);
    if (!m) return null;
    return new Date(2000 + parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

function isActivityExpired(raw) {
    var d = activityEventDate(raw);
    if (!d) return false;
    return Date.now() - d.getTime() > ACTIVITY_EXPIRE_DAYS * 86400000;
}

function populateActivities() {
    var el = document.getElementById('remark-list');
    el.innerHTML = '<option value="">-</option>' +
        arrActivities
            .filter(a => !isActivityExpired(a))
            .map(a => '<option value="' + a + '">' + a + '</option>')
            .join('');
}

function toggleAddActivity() {
    var row = document.getElementById('add-activity-row');
    if (row.style.display !== 'none') {
        cancelAddActivity();
    } else {
        row.style.display = 'flex';
        var d = new Date();
        var prefix = String(d.getFullYear()).slice(-2)
            + String(d.getMonth() + 1).padStart(2, '0')
            + String(d.getDate()).padStart(2, '0') + '_';
        var input = document.getElementById('new-activity-input');
        input.value = prefix;
        input.focus();
        input.setSelectionRange(prefix.length, prefix.length);
    }
}

function cancelAddActivity() {
    document.getElementById('add-activity-row').style.display = 'none';
}

function confirmAddActivity() {
    var name = document.getElementById('new-activity-input').value.trim();
    if (!name) { showMessage('請輸入標記名稱', 'warning'); return; }
    if (name.includes(',')) { showMessage('標記名稱不可包含逗號', 'warning'); return; }
    if (arrActivities.includes(name)) { showMessage('標記已存在', 'warning'); return; }

    var btn = document.getElementById('btn-confirm-activity');
    btn.disabled = true;

    var fd = new FormData();
    fd.append('action', 'addActivity');
    fd.append('name', name);
    fetch(scriptWriteUrl, { method: 'POST', body: fd, mode: 'no-cors' })
        .then(() => {
            arrActivities.push(name);
            populateActivities();
            document.getElementById('remark-list').value = name;
            cancelAddActivity();
            showMessage('標記「' + name + '」已新增', 'success');
        })
        .catch(() => {
            showMessage('網路錯誤，活動新增失敗', 'danger');
        })
        .finally(() => { btn.disabled = false; });
}

(async () => {
    try {
        const [d1, d2] = await Promise.all([fetchSheet(budgets), fetchSheet(nowusing)]);
        const a1 = d1.split(',');
        for (let i = 0; i < (budgets.endRow - budgets.row + 1); i++) {
            arrBudget[i] = a1.splice(0, budgets.endCol - budgets.col + 1);
        }
        const a2 = d2.split(',');
        for (let i = 0; i < (nowusing.endRow - nowusing.row + 1); i++) {
            arrUsed[i] = a2.splice(0, nowusing.endCol - nowusing.col + 1);
        }
        budgetReady = true;
        refreshBudgetDisplay();
    } catch {
        const el = document.getElementById('budget');
        el.style.color = 'gray';
        el.innerHTML = '預算資料載入失敗';
    }
})();

(async () => {
    try {
        const d = await fetchSheet(activityParams);
        arrActivities = d.split(',').map(s => s.trim()).filter(s => s.length > 0);
    } catch {
        arrActivities = [];
    }
    populateActivities();
})();
