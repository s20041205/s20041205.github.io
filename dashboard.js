'use strict';

// ── Category data (mirrors script.js) ────────────────────────────────────────
const TOPCLASS_INCOME  = ['薪資', '利息', '獎金', '投資', '販賣', '租金', '還款', '副業/兼職', '退稅/補助', '其他'];
const TOPCLASS_EXPENSE = ['飲食', '衣裝', '居住', '交通', '教育', '娛樂', '健康', '社交', '其他'];
const SUBCLASS = [
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
const STARS = ['-', '☆☆☆☆☆', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★'];

// Year sheet row layout (fetching rows 3–22, 0-indexed from fetch start)
const INCOME_ROWS  = 8;   // index 0–7
const EXPENSE_ROWS = 9;   // index 8–16
const IDX_INCOME_TOTAL  = 18;
const IDX_EXPENSE_TOTAL = 19;
const IDX_NET           = 20;

const CAT_COLORS = [
    '#4a7c4e', '#6aad6f', '#8bc690', '#a8d6ac',
    '#7c6a4a', '#5c7c9c', '#9c5c7c', '#e67e22', '#95a5a6'
];
const INCOME_COLORS = [
    '#4a7c4e', '#5c9c6a', '#7ab88a', '#a0d4b0',
    '#4a6a7c', '#5c7c9c', '#8aaccc', '#7c4a6a', '#9c6a8a', '#b8a0b8'
];

// ── State ─────────────────────────────────────────────────────────────────────
var currentYear   = new Date().getFullYear();
var currentPerson = '';
var currentMonth  = new Date().getMonth() + 1;
var currentTab    = 'tab-overview';

var yearData     = null;   // 2D array [20 rows][26 cols]
var yearDataFor  = null;   // which year is cached
var budgetData   = [];     // [9] = { name, annual }
var budgetLoaded = false;

var subData     = null;
var subDataFor  = null;   // 'year|person' cache key

var tagData     = null;
var tagDataFor  = null;   // year string or 'all'

var recentRecords   = [];
var activities      = [];
var activeEditRow   = null;   // rowNum currently being edited
var charts          = {};

// ── Formatters ────────────────────────────────────────────────────────────────
function parseNum(v) {
    var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
}

function fmt(n) {
    return '$' + Math.round(n).toLocaleString('zh-TW');
}

function fmtDate(v) {
    if (!v) return '';
    var s = String(v);
    var m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[0] : s;
}

function showMessage(msg, type) {
    var el = document.getElementById('msg-alert');
    el.className = 'alert alert-' + type;
    el.textContent = msg;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.className = 'alert d-none'; }, 4000);
}

// ── Network helpers ───────────────────────────────────────────────────────────
function fetchSheet(params) {
    var url = new URL(APP_CONFIG.scriptReadUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); });
}

function fetchAction(action, extra) {
    var url = new URL(APP_CONFIG.scriptReadUrl);
    url.searchParams.set('action', action);
    url.searchParams.set('sheetUrl', APP_CONFIG.sheetUrl);
    if (extra) Object.entries(extra).forEach(([k, v]) => url.searchParams.set(k, v));
    return fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
}

function parseSheetCSV(text, numCols) {
    var vals = text.split(',');
    var rows = [];
    var numRows = Math.floor(vals.length / numCols);
    for (var i = 0; i < numRows; i++) rows.push(vals.splice(0, numCols));
    return rows;
}

// Month M (1-12) amount from a yearData row
function monthAmt(row, m) { return parseNum(row[3 + (m - 1) * 2]); }
function annualAmt(row)    { return parseNum(row[1]); }

// ── Chart helpers ─────────────────────────────────────────────────────────────
function destroyChart(id) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function baseChartOpts() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
    };
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function doLogin() {
    var pw    = document.getElementById('login-pw').value;
    var errEl = document.getElementById('login-error');
    if (pw === APP_CONFIG.dashboardPassword) {
        sessionStorage.setItem('dash_auth', '1');
        errEl.textContent = '';
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard').style.display   = 'block';
        initDashboard();
    } else {
        errEl.textContent = '密碼錯誤';
        var card = document.querySelector('.login-card');
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
    }
}

function doLogout() {
    sessionStorage.removeItem('dash_auth');
    location.reload();
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.tab-content').forEach(c =>
        c.classList.toggle('active', c.id === tabId));
    currentTab = tabId;

    if (tabId === 'tab-monthly') renderMonthly();
    if (tabId === 'tab-tags' && tagData === null) loadTagData();
    if (tabId === 'tab-edit'  && recentRecords.length === 0) loadRecentRecords();
}

// ── Year / Person controls ────────────────────────────────────────────────────
function onYearChange() {
    currentYear = parseInt(document.getElementById('year-select').value, 10);
    document.getElementById('tag-year-label').textContent = '本年 (' + currentYear + ')';
    yearData    = null;
    yearDataFor = null;
    subData     = null;
    subDataFor  = null;
    tagData     = null;
    tagDataFor  = null;
    loadYearData();
    loadSubData();
    if (currentTab === 'tab-tags') loadTagData();
}

function onPersonChange(person) {
    currentPerson = person;
    document.querySelectorAll('.person-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.person === person));

    var noteIds = ['overview-person-note', 'monthly-person-note'];
    var showNote = person !== '';
    noteIds.forEach(id => {
        document.getElementById(id).style.display = showNote ? '' : 'none';
    });

    subData    = null;
    subDataFor = null;
    loadSubData();
    if (currentTab === 'tab-tags') loadTagData();
    if (currentTab === 'tab-edit') renderRecords();
}

// ── Init ──────────────────────────────────────────────────────────────────────
function buildYearSelect() {
    var sel = document.getElementById('year-select');
    var max = new Date().getFullYear();
    for (var y = max; y >= 2022; y--) {
        var opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y + ' 年';
        if (y === currentYear) opt.selected = true;
        sel.appendChild(opt);
    }
    document.getElementById('tag-year-label').textContent = '本年 (' + currentYear + ')';
}

function initDashboard() {
    buildYearSelect();

    document.getElementById('year-select').addEventListener('change', onYearChange);
    document.getElementById('btn-logout').addEventListener('click', doLogout);
    document.querySelectorAll('.tab-btn').forEach(b =>
        b.addEventListener('click', () => switchTab(b.dataset.tab)));
    document.querySelectorAll('.person-btn').forEach(b =>
        b.addEventListener('click', () => onPersonChange(b.dataset.person)));
    document.getElementById('btn-prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('btn-next-month').addEventListener('click', () => changeMonth(1));
    document.getElementById('btn-refresh-records').addEventListener('click', loadRecentRecords);
    document.getElementById('record-count-select').addEventListener('change', loadRecentRecords);

    document.querySelectorAll('input[name="tag-year-mode"]').forEach(r =>
        r.addEventListener('change', loadTagData));

    document.getElementById('dashboard-body').addEventListener('click', e => {
        var btn = e.target.closest('.drill-close-btn');
        if (btn) { closeDrill(btn.dataset.drill); return; }
        var legendItem = e.target.closest('.donut-clickable');
        if (legendItem) {
            var drillId = legendItem.dataset.drill;
            var catName = legendItem.dataset.cat;
            var month   = legendItem.dataset.month ? parseInt(legendItem.dataset.month, 10) : null;
            renderSubDrill(drillId, catName, month);
        }
    });

    Promise.all([loadBudget(), loadYearData()])
        .then(() => { renderOverview(); renderMonthly(); })
        .catch(() => showMessage('年度資料載入失敗，請重新整理', 'danger'));

    loadSubData().catch(() => {});
    loadActivities().catch(() => {});
}

// ── Budget ────────────────────────────────────────────────────────────────────
async function loadBudget() {
    var text = await fetchSheet({
        sheetUrl: APP_CONFIG.sheetUrl,
        sheetTag: 'config',
        row: 2, col: 1, endRow: 10, endCol: 2
    });
    var vals = text.split(',');
    budgetData = [];
    for (var i = 0; i < EXPENSE_ROWS; i++) {
        budgetData.push({ name: vals[i * 2] || TOPCLASS_EXPENSE[i], annual: parseNum(vals[i * 2 + 1]) });
    }
    budgetLoaded = true;
}

// ── Year data ─────────────────────────────────────────────────────────────────
async function loadYearData() {
    var el = document.getElementById('overview-loading');
    if (el) el.style.display = '';
    var text = await fetchSheet({
        sheetUrl: APP_CONFIG.sheetUrl,
        sheetTag: currentYear,
        row: 3, col: 2, endRow: 23, endCol: 27
    });
    var NUM_COLS = 26;
    yearData    = parseSheetCSV(text, NUM_COLS);
    yearDataFor = currentYear;
}

// ── Drill-down ────────────────────────────────────────────────────────────────
function closeDrill(drillId) {
    var card = document.getElementById(drillId + '-card');
    if (card) card.style.display = 'none';
    destroyChart(drillId);
}

function renderSubDrill(drillId, catName, month) {
    var card     = document.getElementById(drillId + '-card');
    var titleEl  = document.getElementById(drillId + '-title');
    var canvas   = document.getElementById(drillId + '-canvas');
    var legendEl = document.getElementById(drillId + '-legend');
    if (!card || !subData || !subData[catName]) return;

    var catIdx = TOPCLASS_EXPENSE.indexOf(catName);
    var baseColor = CAT_COLORS[catIdx >= 0 ? catIdx : 0];

    var items = Object.entries(subData[catName])
        .map(([sub, info]) => ({
            name: sub,
            amt: month != null ? (info.monthly[month - 1] || 0) : (info.total || 0)
        }))
        .filter(i => i.amt > 0)
        .sort((a, b) => b.amt - a.amt);

    if (!items.length) return;

    var total  = items.reduce((s, i) => s + i.amt, 0);
    var colors = items.map((_, i) =>
        hexToRgba(baseColor, Math.max(0.25, 1 - i * 0.7 / items.length)));
    var label  = month != null ? month + ' 月' : '年度';

    titleEl.textContent = catName + ' 細項分析（' + label + '）';

    destroyChart(drillId);
    charts[drillId] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: items.map(i => i.name),
            datasets: [{ data: items.map(i => i.amt), backgroundColor: colors, borderWidth: 2 }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.parsed) } }
            }
        }
    });

    legendEl.innerHTML = items.map((item, i) => {
        var pct = Math.round(item.amt / total * 100);
        return '<div class="drill-legend-item">' +
            '<span class="drill-legend-dot" style="background:' + colors[i] + '"></span>' +
            '<span class="drill-legend-name">' + esc(item.name) + '</span>' +
            '<span class="drill-legend-amt">' + fmt(item.amt) + '</span>' +
            '<span class="drill-legend-pct">(' + pct + '%)</span>' +
            '</div>';
    }).join('');

    card.style.display = '';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Subcategory data ──────────────────────────────────────────────────────────
async function loadSubData() {
    var key = currentYear + '|' + currentPerson;
    if (subDataFor === key && subData) return;
    var extra = { year: currentYear };
    if (currentPerson) extra.name = currentPerson;
    try {
        subData    = await fetchAction('subSummary', extra);
        subDataFor = key;
    } catch { /* silent — subcategory is optional */ }
}

// ── Tab 1: Year Overview ──────────────────────────────────────────────────────
function renderOverview() {
    if (!yearData || yearData.length < IDX_NET + 1) return;

    var incomeTotal  = annualAmt(yearData[IDX_INCOME_TOTAL]);
    var expenseTotal = annualAmt(yearData[IDX_EXPENSE_TOTAL]);
    var netTotal     = annualAmt(yearData[IDX_NET]);

    document.getElementById('card-income').textContent  = fmt(incomeTotal);
    document.getElementById('card-expense').textContent = fmt(expenseTotal);
    var netEl = document.getElementById('card-net');
    netEl.textContent  = fmt(netTotal);
    netEl.style.color  = netTotal >= 0 ? 'var(--primary-dark)' : 'var(--danger)';

    // Monthly trend chart
    var months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    var incomeByMonth  = months.map((_, i) => monthAmt(yearData[IDX_INCOME_TOTAL],  i + 1));
    var expenseByMonth = months.map((_, i) => monthAmt(yearData[IDX_EXPENSE_TOTAL], i + 1));

    var loadingEl = document.getElementById('overview-loading');
    var trendCanvas = document.getElementById('chart-monthly-trend');
    if (loadingEl) loadingEl.style.display = 'none';
    trendCanvas.style.display = '';

    destroyChart('monthly-trend');
    charts['monthly-trend'] = new Chart(trendCanvas, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: '收入', data: incomeByMonth,  backgroundColor: 'rgba(74,124,78,0.7)',  borderRadius: 4 },
                { label: '支出', data: expenseByMonth, backgroundColor: 'rgba(141,76,68,0.7)', borderRadius: 4 }
            ]
        },
        options: {
            ...baseChartOpts(),
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { boxWidth: 12, font: { size: 12 } }
                },
                tooltip: {
                    callbacks: { label: ctx => ' ' + fmt(ctx.parsed.y) }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } }
            }
        }
    });

    // Income donut
    var incRows       = yearData.slice(0, INCOME_ROWS);
    var incNames      = incRows.map((r, i) => r[0] || TOPCLASS_INCOME[i]);
    var incAmts       = incRows.map(r => Math.max(0, annualAmt(r)));
    var incDonutData  = incAmts.filter(v => v > 0);
    var incDonutLabels = incNames.filter((_, i) => incAmts[i] > 0);
    var incDonutColors = INCOME_COLORS.filter((_, i) => incAmts[i] > 0);

    var incDonutCanvas = document.getElementById('chart-income-donut');
    incDonutCanvas.style.display = '';
    destroyChart('income-donut');
    charts['income-donut'] = new Chart(incDonutCanvas, {
        type: 'doughnut',
        data: { labels: incDonutLabels, datasets: [{ data: incDonutData, backgroundColor: incDonutColors, borderWidth: 2 }] },
        options: {
            responsive: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.parsed) } }
            }
        }
    });
    var incLegendEl = document.getElementById('income-donut-legend');
    var incTotal    = incDonutData.reduce((a, b) => a + b, 0) || 1;
    incLegendEl.innerHTML = incDonutLabels.map((name, i) =>
        '<div class="donut-legend-item">' +
        '<span class="donut-legend-dot" style="background:' + incDonutColors[i] + '"></span>' +
        '<span class="donut-legend-name">' + name + '</span>' +
        '<span class="donut-legend-val">' + fmt(incDonutData[i]) + '</span>' +
        '<span class="donut-legend-pct">(' + Math.round(incDonutData[i] / incTotal * 100) + '%)</span>' +
        '</div>'
    ).join('');

    // Expense donut
    var expRows   = yearData.slice(INCOME_ROWS, INCOME_ROWS + EXPENSE_ROWS);
    var expNames  = expRows.map((r, i) => r[0] || TOPCLASS_EXPENSE[i]);
    var expAmts   = expRows.map(r => Math.max(0, annualAmt(r)));
    var donutData = expAmts.filter(v => v > 0);
    var donutLabels = expNames.filter((_, i) => expAmts[i] > 0);
    var donutColors = CAT_COLORS.filter((_, i) => expAmts[i] > 0);

    var donutCanvas = document.getElementById('chart-expense-donut');
    donutCanvas.style.display = '';
    destroyChart('expense-donut');
    charts['expense-donut'] = new Chart(donutCanvas, {
        type: 'doughnut',
        data: { labels: donutLabels, datasets: [{ data: donutData, backgroundColor: donutColors, borderWidth: 2 }] },
        options: {
            responsive: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.parsed) } }
            },
            onClick: (e, elements) => {
                if (!elements.length) return;
                renderSubDrill('drill-overview', donutLabels[elements[0].index], null);
            }
        }
    });

    // Expense legend (clickable)
    var legendEl = document.getElementById('donut-legend');
    var total    = donutData.reduce((a, b) => a + b, 0) || 1;
    legendEl.innerHTML = donutLabels.map((name, i) =>
        '<div class="donut-legend-item donut-clickable" data-drill="drill-overview" data-cat="' + name + '" data-month="">' +
        '<span class="donut-legend-dot" style="background:' + donutColors[i] + '"></span>' +
        '<span class="donut-legend-name">' + name + '</span>' +
        '<span class="donut-legend-val">' + fmt(donutData[i]) + '</span>' +
        '<span class="donut-legend-pct">(' + Math.round(donutData[i] / total * 100) + '%)</span>' +
        '</div>'
    ).join('');
}

// ── Tab 2: Monthly Detail ─────────────────────────────────────────────────────
function changeMonth(delta) {
    currentMonth = Math.min(12, Math.max(1, currentMonth + delta));
    renderMonthly();
}

function renderMonthly() {
    document.getElementById('month-label').textContent = currentYear + ' 年 ' + currentMonth + ' 月';
    if (!yearData || yearData.length < IDX_NET + 1) return;

    // Close drill panel when month changes
    closeDrill('drill-monthly');

    // Monthly expense doughnut
    var expRows    = yearData.slice(INCOME_ROWS, INCOME_ROWS + EXPENSE_ROWS);
    var expNames   = expRows.map((r, i) => r[0] || TOPCLASS_EXPENSE[i]);
    var expAmts    = expRows.map(r => Math.max(0, monthAmt(r, currentMonth)));
    var mDonutData    = expAmts.filter(v => v > 0);
    var mDonutLabels  = expNames.filter((_, i) => expAmts[i] > 0);
    var mDonutColors  = CAT_COLORS.filter((_, i) => expAmts[i] > 0);

    var mDonutCanvas = document.getElementById('chart-monthly-donut');
    mDonutCanvas.style.display = mDonutData.length ? '' : 'none';

    if (mDonutData.length) {
        destroyChart('monthly-donut');
        charts['monthly-donut'] = new Chart(mDonutCanvas, {
            type: 'doughnut',
            data: { labels: mDonutLabels, datasets: [{ data: mDonutData, backgroundColor: mDonutColors, borderWidth: 2 }] },
            options: {
                responsive: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.parsed) } }
                },
                onClick: (e, elements) => {
                    if (!elements.length) return;
                    renderSubDrill('drill-monthly', mDonutLabels[elements[0].index], currentMonth);
                }
            }
        });
        var mTotal = mDonutData.reduce((a, b) => a + b, 0) || 1;
        document.getElementById('monthly-donut-legend').innerHTML = mDonutLabels.map((name, i) =>
            '<div class="donut-legend-item donut-clickable" data-drill="drill-monthly" data-cat="' + name + '" data-month="' + currentMonth + '">' +
            '<span class="donut-legend-dot" style="background:' + mDonutColors[i] + '"></span>' +
            '<span class="donut-legend-name">' + name + '</span>' +
            '<span class="donut-legend-val">' + fmt(mDonutData[i]) + '</span>' +
            '<span class="donut-legend-pct">(' + Math.round(mDonutData[i] / mTotal * 100) + '%)</span>' +
            '</div>'
        ).join('');
    }

    // Expense chart (horizontal bar with budget)
    var budgetMonthly = budgetData.map(b => b.annual / 12);

    var expWrap = document.getElementById('monthly-expense-wrap');
    expWrap.innerHTML = '<canvas id="chart-monthly-expense"></canvas>';
    var expCanvas = document.getElementById('chart-monthly-expense');

    destroyChart('monthly-expense');
    charts['monthly-expense'] = new Chart(expCanvas, {
        type: 'bar',
        data: {
            labels: expNames,
            datasets: [
                {
                    label: '本月支出',
                    data: expAmts,
                    backgroundColor: expAmts.map((v, i) =>
                        budgetLoaded && budgetMonthly[i] > 0 && v > budgetMonthly[i]
                            ? 'rgba(141,76,68,0.75)' : 'rgba(74,124,78,0.7)'),
                    borderRadius: 4
                },
                ...(budgetLoaded ? [{
                    label: '月均預算',
                    data: budgetMonthly,
                    backgroundColor: 'rgba(200,200,200,0.35)',
                    borderRadius: 4
                }] : [])
            ]
        },
        options: {
            ...baseChartOpts(),
            maintainAspectRatio: true,
            aspectRatio: 2.2,
            indexAxis: 'y',
            plugins: {
                legend: { display: budgetLoaded, position: 'top', labels: { boxWidth: 12, font: { size: 12 } } },
                tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.parsed.x) } }
            },
            scales: {
                x: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } },
                y: { grid: { display: false } }
            }
        }
    });

    // Income doughnut
    var incRows        = yearData.slice(0, INCOME_ROWS);
    var incNames       = incRows.map((r, i) => r[0] || TOPCLASS_INCOME[i]);
    var incAmts        = incRows.map(r => Math.max(0, monthAmt(r, currentMonth)));
    var incDonutData   = incAmts.filter(v => v > 0);
    var incDonutLabels = incNames.filter((_, i) => incAmts[i] > 0);
    var incDonutColors = INCOME_COLORS.filter((_, i) => incAmts[i] > 0);

    var incDonutCanvas = document.getElementById('chart-monthly-income-donut');
    var incLegendEl    = document.getElementById('monthly-income-donut-legend');
    incDonutCanvas.style.display = incDonutData.length ? '' : 'none';
    destroyChart('monthly-income-donut');

    if (incDonutData.length) {
        charts['monthly-income-donut'] = new Chart(incDonutCanvas, {
            type: 'doughnut',
            data: { labels: incDonutLabels, datasets: [{ data: incDonutData, backgroundColor: incDonutColors, borderWidth: 2 }] },
            options: {
                responsive: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.parsed) } }
                }
            }
        });
        var incTotal = incDonutData.reduce((a, b) => a + b, 0) || 1;
        incLegendEl.innerHTML = incDonutLabels.map((name, i) =>
            '<div class="donut-legend-item">' +
            '<span class="donut-legend-dot" style="background:' + incDonutColors[i] + '"></span>' +
            '<span class="donut-legend-name">' + name + '</span>' +
            '<span class="donut-legend-val">' + fmt(incDonutData[i]) + '</span>' +
            '<span class="donut-legend-pct">(' + Math.round(incDonutData[i] / incTotal * 100) + '%)</span>' +
            '</div>'
        ).join('');
    } else {
        incLegendEl.innerHTML = '<div class="loading-text" style="padding:20px">本月無收入資料</div>';
    }

}

// ── Tab 3: Tag Summary ────────────────────────────────────────────────────────
async function loadTagData() {
    var mode     = document.querySelector('input[name="tag-year-mode"]:checked').value;
    var tagKey   = mode === 'current' ? String(currentYear) : 'all';
    var extra    = {};
    if (mode === 'current') extra.year = currentYear;
    if (currentPerson)      extra.name = currentPerson;

    document.getElementById('tag-chart-wrap').innerHTML = '<div class="loading-text">載入中...</div>';
    document.getElementById('tag-tbody').innerHTML = '<tr><td colspan="3" class="loading-text">載入中...</td></tr>';

    try {
        tagData    = await fetchAction('tagSummary', extra);
        tagDataFor = tagKey;
        renderTags();
    } catch {
        document.getElementById('tag-chart-wrap').innerHTML = '<div class="loading-text">載入失敗</div>';
        document.getElementById('tag-tbody').innerHTML      = '<tr><td colspan="3" class="loading-text">載入失敗</td></tr>';
    }
}

function renderTags() {
    if (!tagData) return;

    var entries = Object.entries(tagData)
        .map(([name, obj]) => ({ name, total: obj.total || 0, cats: obj.cats || {} }))
        .filter(e => e.total > 0)
        .sort((a, b) => b.total - a.total);

    if (entries.length === 0) {
        document.getElementById('tag-chart-wrap').innerHTML = '<div class="loading-text">無資料</div>';
        document.getElementById('tag-tbody').innerHTML      = '<tr><td colspan="3" class="loading-text">無標記記錄</td></tr>';
        return;
    }

    // Horizontal bar chart
    var labels = entries.map(e => e.name);
    var values = entries.map(e => e.total);
    var wrap   = document.getElementById('tag-chart-wrap');
    wrap.innerHTML = '<canvas id="chart-tags"></canvas>';
    var canvas = document.getElementById('chart-tags');

    destroyChart('tags');
    charts['tags'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ data: values, backgroundColor: 'rgba(74,124,78,0.7)', borderRadius: 4 }]
        },
        options: {
            ...baseChartOpts(),
            maintainAspectRatio: true,
            aspectRatio: Math.max(1.5, 4 - entries.length * 0.15),
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.parsed.x) } }
            },
            scales: {
                x: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } },
                y: { grid: { display: false } }
            }
        }
    });

    // Table
    var expTotal = entries.reduce((s, e) => s + e.total, 0) || 1;
    var tbody = document.getElementById('tag-tbody');
    tbody.innerHTML = entries.map(e => {
        var catEntries = Object.entries(e.cats).sort((a, b) => b[1] - a[1]);
        var miniBar = catEntries.map(([cat, amt]) => {
            var idx  = TOPCLASS_EXPENSE.indexOf(cat);
            var col  = CAT_COLORS[idx >= 0 ? idx : 8];
            return '<span class="mini-bar-item">' +
                '<span class="mini-bar-dot" style="background:' + col + '"></span>' +
                cat + ' ' + fmt(amt) + '</span>';
        }).join(' ');
        return '<tr>' +
            '<td>' + e.name + '</td>' +
            '<td>' + fmt(e.total) + ' <span style="color:var(--text-muted);font-size:0.78rem">(' + Math.round(e.total / expTotal * 100) + '%)</span></td>' +
            '<td><div class="mini-bars">' + (miniBar || '—') + '</div></td>' +
            '</tr>';
    }).join('');
}

// ── Tab 4: Recent Records ─────────────────────────────────────────────────────
async function loadRecentRecords() {
    var count = parseInt(document.getElementById('record-count-select').value, 10);
    document.getElementById('edit-tbody').innerHTML =
        '<tr><td colspan="10" class="loading-text">載入中...</td></tr>';
    cancelEdit();
    try {
        recentRecords = await fetchAction('recentRecords', { count });
        renderRecords();
    } catch {
        document.getElementById('edit-tbody').innerHTML =
            '<tr><td colspan="10" class="loading-text">載入失敗，請重試</td></tr>';
    }
}

async function loadActivities() {
    var text = await fetchSheet({
        sheetUrl: APP_CONFIG.sheetUrl,
        sheetTag: 'config',
        row: 2, col: 5, endRow: 51, endCol: 5
    });
    activities = text.split(',').map(s => s.trim()).filter(Boolean);
}

function renderRecords() {
    var filtered = currentPerson
        ? recentRecords.filter(r => r.name === currentPerson)
        : recentRecords;

    if (filtered.length === 0) {
        document.getElementById('edit-tbody').innerHTML =
            '<tr><td colspan="10" class="loading-text">無資料</td></tr>';
        return;
    }

    var tbody = document.getElementById('edit-tbody');
    tbody.innerHTML = filtered.map(r =>
        '<tr data-rownum="' + r.rowNum + '">' +
        '<td>' + fmtDate(r.date)   + '</td>' +
        '<td>' + (r.balance  || '') + '</td>' +
        '<td>' + (r.topclass || '') + '</td>' +
        '<td>' + (r.subclass || '') + '</td>' +
        '<td>' + fmt(parseNum(r.price)) + '</td>' +
        '<td>' + esc(r.store  || '') + '</td>' +
        '<td>' + esc(r.detail || '') + '</td>' +
        '<td>' + esc(r.tag    || '') + '</td>' +
        '<td>' + (r.name     || '') + '</td>' +
        '<td><button class="btn-edit" onclick="openEditRow(' + r.rowNum + ')">編輯</button></td>' +
        '</tr>'
    ).join('');
}

function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Edit row ──────────────────────────────────────────────────────────────────
function cancelEdit() {
    if (activeEditRow === null) return;
    var editTr = document.getElementById('edit-row-' + activeEditRow);
    if (editTr) editTr.remove();
    var origTr = document.querySelector('[data-rownum="' + activeEditRow + '"]');
    if (origTr) origTr.classList.remove('editing');
    activeEditRow = null;
}

function openEditRow(rowNum) {
    cancelEdit();
    var record = recentRecords.find(r => r.rowNum === rowNum);
    if (!record) return;
    activeEditRow = rowNum;

    var origTr = document.querySelector('[data-rownum="' + rowNum + '"]');
    if (!origTr) return;
    origTr.classList.add('editing');

    var editTr = document.createElement('tr');
    editTr.id  = 'edit-row-' + rowNum;
    editTr.innerHTML =
        '<td colspan="10"><div class="inline-edit-form">' +
        '<div class="edit-grid">' +
        editField('日期',   '<input type="date" name="Date" value="' + fmtDate(record.date) + '">') +
        editField('收支',   buildSelect('Balance', ['收入','支出'], record.balance)) +
        editField('大類',   buildTopclassSelect(record)) +
        editField('小類',   buildSubclassSelect(record)) +
        editField('金額',   '<input type="text" inputmode="decimal" name="Price" value="' + parseNum(record.price) + '">') +
        editField('店家',   '<input type="text" name="Store"  value="' + esc(record.store  || '') + '">') +
        editField('項目',   '<input type="text" name="Detail" value="' + esc(record.detail || '') + '">') +
        editField('星評',   buildSelect('Recommendation', STARS, record.recommendation)) +
        editField('標記',   buildTagSelect(record.tag)) +
        editField('使用者', buildSelect('Name', ['Jerry_Hu','Alice_Lin'], record.name)) +
        '</div>' +
        '<div class="edit-actions">' +
        '<button class="btn-save"        onclick="submitEdit(' + rowNum + ')">儲存</button>' +
        '<button class="btn-delete"      onclick="confirmDelete(' + rowNum + ')">刪除</button>' +
        '<button class="btn-cancel-edit" onclick="cancelEdit()">取消</button>' +
        '</div>' +
        '</div></td>';

    origTr.insertAdjacentElement('afterend', editTr);

    // Balance change → update topclass / subclass options
    var balanceSel  = editTr.querySelector('[name=Balance]');
    var topclassSel = editTr.querySelector('[name=Topclass]');
    var subclassSel = editTr.querySelector('[name=Subclass]');

    balanceSel.addEventListener('change', () => {
        var isExpense = balanceSel.value === '支出';
        topclassSel.innerHTML = buildOptions(isExpense ? TOPCLASS_EXPENSE : TOPCLASS_INCOME);
        subclassSel.innerHTML = isExpense ? buildOptions(SUBCLASS[0]) : '';
        subclassSel.hidden    = !isExpense;
    });

    topclassSel.addEventListener('change', () => {
        var isExpense = balanceSel.value === '支出';
        var idx       = topclassSel.selectedIndex;
        subclassSel.innerHTML = isExpense ? buildOptions(SUBCLASS[idx] || []) : '';
        subclassSel.hidden    = !isExpense;
    });
}

function editField(label, inputHtml) {
    return '<div class="edit-field"><label>' + label + '</label>' + inputHtml + '</div>';
}

function buildOptions(arr, selected) {
    return arr.map(v =>
        '<option' + (v === selected ? ' selected' : '') + '>' + esc(v) + '</option>'
    ).join('');
}

function buildSelect(name, options, selected) {
    return '<select name="' + name + '">' + buildOptions(options, selected) + '</select>';
}

function buildTopclassSelect(record) {
    var isExpense = record.balance === '支出';
    var opts      = isExpense ? TOPCLASS_EXPENSE : TOPCLASS_INCOME;
    return '<select name="Topclass">' + buildOptions(opts, record.topclass) + '</select>';
}

function buildSubclassSelect(record) {
    var isExpense = record.balance === '支出';
    var idx       = isExpense ? TOPCLASS_EXPENSE.indexOf(record.topclass) : -1;
    var opts      = idx >= 0 ? SUBCLASS[idx] : [];
    return '<select name="Subclass"' + (isExpense ? '' : ' hidden') + '>' +
        buildOptions(opts, record.subclass) + '</select>';
}

function buildTagSelect(current) {
    var opts = ['', ...activities];
    return '<select name="Tag">' + buildOptions(opts, current || '') + '</select>';
}

async function submitEdit(rowNum) {
    var editTr = document.getElementById('edit-row-' + rowNum);
    if (!editTr) return;
    var saveBtn = editTr.querySelector('.btn-save');
    saveBtn.disabled = true;
    saveBtn.textContent = '儲存中...';

    var data = {};
    editTr.querySelectorAll('input,select').forEach(el => {
        if (el.name) data[el.name] = el.value;
    });
    data.rowNum = rowNum;

    try {
        var res = await fetchAction('updateRecord', data);
        if (res && res.result === 'ok') {
            // Update local cache
            var idx = recentRecords.findIndex(r => r.rowNum === rowNum);
            if (idx >= 0) {
                Object.assign(recentRecords[idx], {
                    date: data.Date, balance: data.Balance, topclass: data.Topclass,
                    subclass: data.Subclass, price: data.Price, store: data.Store,
                    detail: data.Detail, recommendation: data.Recommendation,
                    tag: data.Tag, name: data.Name
                });
            }
            cancelEdit();
            renderRecords();
            showMessage('已儲存', 'success');
        } else {
            throw new Error('GAS returned error');
        }
    } catch {
        showMessage('儲存失敗，請重試', 'danger');
        saveBtn.disabled = false;
        saveBtn.textContent = '儲存';
    }
}

function confirmDelete(rowNum) {
    if (!confirm('確定刪除這筆記錄？此操作無法復原。')) return;
    deleteRecord(rowNum);
}

async function deleteRecord(rowNum) {
    try {
        var res = await fetchAction('deleteRecord', { rowNum });
        if (res && res.result === 'ok') {
            recentRecords = recentRecords.filter(r => r.rowNum !== rowNum);
            cancelEdit();
            renderRecords();
            showMessage('已刪除', 'success');
        } else {
            throw new Error('GAS returned error');
        }
    } catch {
        showMessage('刪除失敗，請重試', 'danger');
    }
}

// ── Page init ─────────────────────────────────────────────────────────────────
document.getElementById('btn-login').addEventListener('click', doLogin);
document.getElementById('login-pw').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
});

if (sessionStorage.getItem('dash_auth') === '1') {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display   = 'block';
    initDashboard();
}
