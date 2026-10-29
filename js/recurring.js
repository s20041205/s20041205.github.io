'use strict';

// ── Category data (mirrors script.js / dashboard.js) ─────────────────────────
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
const FREQ_LABEL  = { weekly: '每週', monthly: '每月', yearly: '每年' };
const FREQ_UNIT   = { weekly: '週', monthly: '個月', yearly: '年' };

var items = [];

// ── Helpers ─────────────────────────────────────────────────────────────────
function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtMoney(n) {
    return '$' + (Math.round(Number(n)) || 0).toLocaleString('zh-TW');
}

function todayLocal() {
    var d = new Date();
    return d.getFullYear() + '-'
        + String(d.getMonth() + 1).padStart(2, '0') + '-'
        + String(d.getDate()).padStart(2, '0');
}

function showMessage(msg, type) {
    var el = document.getElementById('msg-alert');
    el.className = 'alert alert-' + type;
    el.textContent = msg;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.className = 'alert d-none'; }, 4000);
}

function buildOptions(arr, selected) {
    return arr.map(v => '<option' + (v === selected ? ' selected' : '') + '>' + esc(v) + '</option>').join('');
}

var fetchAction = Api.action;   // js/api.js

function enterApp() {
    document.getElementById('recurring-app').style.display = 'block';
    loadList();
}

// ── Category selects ────────────────────────────────────────────────────────
function populateTopclass(selected) {
    document.getElementById('f-topclass').innerHTML = buildOptions(TOPCLASS_EXPENSE, selected);
}

function populateSubclass(topclass, selected) {
    var idx = TOPCLASS_EXPENSE.indexOf(topclass);
    document.getElementById('f-subclass').innerHTML = buildOptions(idx >= 0 ? SUBCLASS[idx] : [], selected);
}

// ── List ────────────────────────────────────────────────────────────────────
async function loadList() {
    var listEl = document.getElementById('rec-list');
    listEl.innerHTML = '<div class="loading-text">載入中...</div>';
    try {
        var data = await fetchAction('recurringExpenses');
        items = (data && data.items) || [];
        renderAutomationNote(data && data.automationEnabled);
        renderList();
    } catch {
        listEl.innerHTML = '<div class="loading-text">載入失敗，請重試</div>';
    }
}

function renderAutomationNote(enabled) {
    var el = document.getElementById('automation-note');
    if (enabled) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.textContent = '⚠️ 尚未安裝每日觸發器。請在 Apps Script 執行 setupRecurringExpenses() 後，自動記帳才會運作（仍可用「手動補跑」）。';
}

// ── Schedule (mirrors gas/RecurringExpenses.gs nextRecurringDate_) ─────────
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

function toYmd(d) {
    return d.getFullYear() + '-'
        + String(d.getMonth() + 1).padStart(2, '0') + '-'
        + String(d.getDate()).padStart(2, '0');
}

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

// 下一期日期：月 / 年以「首次扣款日」的日為準（遇到小月取月底）
function nextDue(start, due, frequency, interval) {
    if (frequency === 'weekly') {
        return new Date(due.getFullYear(), due.getMonth(), due.getDate() + 7 * interval);
    }
    if (frequency === 'monthly') {
        var first = new Date(due.getFullYear(), due.getMonth() + interval, 1);
        return new Date(first.getFullYear(), first.getMonth(),
            Math.min(start.getDate(), daysInMonth(first.getFullYear(), first.getMonth())));
    }
    var y = due.getFullYear() + interval;
    return new Date(y, start.getMonth(), Math.min(start.getDate(), daysInMonth(y, start.getMonth())));
}

// 例：每月 18 日、每 2 個月 5 日、每週三、每年 9/18
function everyLabel(it) {
    var start = parseYmd(it.startDate);
    var n     = Number(it.interval) || 1;
    var head  = n > 1 ? '每 ' + n + ' ' + (FREQ_UNIT[it.frequency] || '') : (FREQ_LABEL[it.frequency] || it.frequency);
    if (!start) return head;
    if (it.frequency === 'weekly')  return head + (n > 1 ? ' 週' : '') + WEEKDAYS[start.getDay()];
    if (it.frequency === 'monthly') return head + ' ' + start.getDate() + ' 日';
    if (it.frequency === 'yearly')  return head + ' ' + (start.getMonth() + 1) + '/' + start.getDate();
    return head;
}

function renderList() {
    var listEl = document.getElementById('rec-list');
    if (!items.length) {
        listEl.innerHTML = '<div class="loading-text">尚無週期性花費，點「＋ 新增訂閱」開始。</div>';
        return;
    }
    listEl.innerHTML = items.map(it =>
        '<div class="rec-card' + (it.active ? '' : ' inactive') + '">' +
            '<div class="rec-card-main">' +
                '<div class="rec-card-name">' + esc(it.service) +
                    (it.active ? '' : ' <span class="rec-badge">已停用</span>') + '</div>' +
                '<div class="rec-card-meta">' + esc(everyLabel(it)) + ' · ' +
                    esc(it.topclass) + '／' + esc(it.subclass) +
                    ' · 下次 ' + esc(it.nextDate || '—') +
                    (it.endDate ? ' · 至 ' + esc(it.endDate) : '') + '</div>' +
                (it.name || it.lastRunDate
                    ? '<div class="rec-card-sub">' + esc(it.name || '') +
                        (it.lastRunDate ? ' · 上次記帳 ' + esc(it.lastRunDate) : '') + '</div>'
                    : '') +
            '</div>' +
            '<div class="rec-card-side">' +
                '<div class="rec-card-price">' + fmtMoney(it.price) + '</div>' +
                '<div class="rec-card-actions">' +
                    '<button type="button" class="btn-edit" data-edit="' + esc(it.id) + '">編輯</button>' +
                    '<button type="button" class="btn-edit" data-toggle="' + esc(it.id) + '">' +
                        (it.active ? '停用' : '啟用') + '</button>' +
                '</div>' +
            '</div>' +
        '</div>'
    ).join('');
}

// ── Add / edit form ─────────────────────────────────────────────────────────
var nextTouched = false;   // 使用者手動改過「下一次記帳日」就不再自動同步

function onScheduleChange(e) {
    var form = document.getElementById('rec-form');
    if (e && e.target === form.NextDate) nextTouched = true;
    // 新增時，下一次記帳日跟著首次扣款日
    if (!form.Id.value && !nextTouched && form.StartDate.value) {
        form.NextDate.value = form.StartDate.value;
    }
    renderScheduleSummary();
}

function renderScheduleSummary() {
    var form  = document.getElementById('rec-form');
    var el    = document.getElementById('schedule-summary');
    var start = parseYmd(form.StartDate.value);
    var next  = parseYmd(form.NextDate.value);
    var end   = parseYmd(form.EndDate.value);
    var n     = Number(form.Interval.value);
    if (!start || !next || !(n >= 1)) { el.innerHTML = ''; return; }

    var label = everyLabel({ startDate: form.StartDate.value, frequency: form.Frequency.value, interval: n });
    var price = parseFloat(form.Price.value) > 0 ? ' ' + fmtMoney(form.Price.value) : '';
    var html  = '📅 <b>' + esc(label) + '</b> 記帳' + esc(price);

    // 今天以前（含）已到期、尚未記帳的期數
    var today = parseYmd(todayLocal());
    var due = [], d = next;
    while (d <= today && (!end || d <= end) && due.length < 120) {
        due.push(toYmd(d));
        d = nextDue(start, d, form.Frequency.value, n);
    }
    if (end && d > end && !due.length && next > end) {
        html += '<br>⚠️ 下一次記帳日已超過結束日，不會再記帳';
    } else if (due.length) {
        var shown = due.slice(0, 3).join('、') + (due.length > 3 ? ' …' : '');
        html += '<br>⏳ 已到期 ' + due.length + ' 期（' + esc(shown) + '），' +
            '儲存後會在每日 03:15 自動補記，或按「手動補跑」立即補記';
        if (!end || d <= end) html += '<br>之後下一次：' + esc(toYmd(d));
    } else {
        html += '<br>下一次：' + esc(toYmd(next));
    }
    el.innerHTML = html;
}
function setRadio(name, value) {
    var el = document.querySelector('#rec-form input[name=' + name + '][value="' + value + '"]');
    if (el) el.checked = true;
}

function openForm(item) {
    var form = document.getElementById('rec-form');
    form.reset();
    document.getElementById('rec-form-title').textContent = item ? '編輯訂閱' : '新增訂閱';
    document.getElementById('btn-delete').style.display = item ? '' : 'none';

    var today = todayLocal();
    if (item) {
        form.Id.value          = item.id;
        form.Service.value     = item.service || '';
        form.Website.value     = item.website || '';
        form.Price.value       = item.price || '';
        populateTopclass(item.topclass);
        populateSubclass(item.topclass, item.subclass);
        form.Frequency.value   = item.frequency || 'monthly';
        form.Interval.value    = item.interval || 1;
        form.StartDate.value   = item.startDate || today;
        form.NextDate.value    = item.nextDate || item.startDate || today;
        form.EndDate.value     = item.endDate || '';
        form.Store.value       = item.store || '';
        form.Detail.value      = item.detail || '';
        form.Recommendation.value = STARS.indexOf(item.recommendation) >= 0 ? item.recommendation : '-';
        form.Tag.value         = item.tag || '';
        setRadio('Name', item.name === 'Alice_Lin' ? 'Alice_Lin' : 'Jerry_Hu');
        document.getElementById('f-active').checked = !!item.active;
    } else {
        form.Id.value        = '';
        populateTopclass();
        populateSubclass(TOPCLASS_EXPENSE[0]);
        form.Frequency.value = 'monthly';
        form.Interval.value  = 1;
        form.StartDate.value = today;
        form.NextDate.value  = today;
        form.Recommendation.value = '-';
        setRadio('Name', 'Jerry_Hu');
        document.getElementById('f-active').checked = true;
    }

    nextTouched = false;
    renderScheduleSummary();

    var card = document.getElementById('rec-form-card');
    card.style.display = '';
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeForm() {
    document.getElementById('rec-form-card').style.display = 'none';
}

async function saveForm(e) {
    e.preventDefault();
    var form = document.getElementById('rec-form');
    var btn  = document.getElementById('btn-save');

    var data = {
        Id:             form.Id.value,
        Service:        form.Service.value.trim(),
        Website:        form.Website.value.trim(),
        Price:          form.Price.value.trim(),
        Topclass:       form.Topclass.value,
        Subclass:       form.Subclass.value,
        Frequency:      form.Frequency.value,
        Interval:       form.Interval.value,
        StartDate:      form.StartDate.value,
        NextDate:       form.NextDate.value,
        EndDate:        form.EndDate.value,
        Store:          form.Store.value.trim(),
        Detail:         form.Detail.value.trim(),
        Recommendation: form.Recommendation.value,
        Tag:            form.Tag.value.trim(),
        Name:           (form.querySelector('input[name=Name]:checked') || {}).value || 'Jerry_Hu',
        Active:         document.getElementById('f-active').checked ? 'true' : 'false'
    };

    // client-side checks mirroring GAS validateRecurringParams_
    if (!data.Service) return showMessage('請輸入訂閱名稱', 'warning');
    if (!(parseFloat(data.Price) > 0)) return showMessage('金額需大於 0', 'warning');
    if (data.Website && !/^https?:\/\/\S+$/i.test(data.Website)) return showMessage('網址需以 http(s):// 開頭', 'warning');
    if (!data.StartDate || !data.NextDate) return showMessage('請填起始日與下次記帳日', 'warning');
    if (data.EndDate && data.EndDate < data.NextDate) return showMessage('結束日不可早於下次記帳日', 'warning');
    if (!(Number(data.Interval) >= 1 && Number(data.Interval) <= 60)) return showMessage('間隔需為 1–60', 'warning');

    btn.disabled = true;
    btn.textContent = '儲存中...';
    try {
        var res = await fetchAction('saveRecurringExpense', data);
        if (res && res.result === 'ok') {
            showMessage('已儲存', 'success');
            closeForm();
            loadList();
        } else {
            throw new Error((res && res.error) || 'save failed');
        }
    } catch (err) {
        showMessage('儲存失敗：' + err.message, 'danger');
    } finally {
        btn.disabled = false;
        btn.textContent = '儲存';
    }
}

async function toggleActive(id) {
    var it = items.find(x => x.id === id);
    if (!it) return;
    try {
        var res = await fetchAction('setRecurringExpenseActive', { Id: id, Active: it.active ? 'false' : 'true' });
        if (res && res.result === 'ok') loadList();
        else throw new Error((res && res.error) || 'failed');
    } catch (err) {
        showMessage('切換失敗：' + err.message, 'danger');
    }
}

async function deleteItem() {
    var id = document.getElementById('rec-form').Id.value;
    if (!id) return;
    if (!confirm('確定刪除這個週期性花費？已記帳的資料不受影響。')) return;
    try {
        var res = await fetchAction('deleteRecurringExpense', { Id: id });
        if (res && res.result === 'ok') {
            showMessage('已刪除', 'success');
            closeForm();
            loadList();
        } else {
            throw new Error((res && res.error) || 'failed');
        }
    } catch (err) {
        showMessage('刪除失敗：' + err.message, 'danger');
    }
}

async function runNow() {
    var btn = document.getElementById('btn-run');
    btn.disabled = true;
    btn.textContent = '補跑中...';
    try {
        var res = await fetchAction('runRecurringExpenses');
        if (res && res.result === 'ok') {
            showMessage('補跑完成：新增 ' + (res.posted || 0) + ' 筆，略過 ' + (res.skipped || 0) + ' 筆', 'success');
            loadList();
        } else {
            throw new Error((res && res.error) || 'failed');
        }
    } catch (err) {
        showMessage('補跑失敗：' + err.message, 'danger');
    } finally {
        btn.disabled = false;
        btn.textContent = '手動補跑';
    }
}

// ── Init ────────────────────────────────────────────────────────────────────
document.getElementById('f-recommendation').innerHTML = buildOptions(STARS);
document.getElementById('f-topclass').addEventListener('change', function () {
    populateSubclass(this.value);
});
['f-start', 'f-next', 'f-end', 'f-interval', 'f-frequency', 'f-price'].forEach(id =>
    document.getElementById(id).addEventListener('input', onScheduleChange));

document.getElementById('btn-logout').addEventListener('click', Api.logout);
document.getElementById('btn-add').addEventListener('click', () => openForm(null));
document.getElementById('btn-run').addEventListener('click', runNow);
document.getElementById('btn-cancel').addEventListener('click', closeForm);
document.getElementById('btn-delete').addEventListener('click', deleteItem);
document.getElementById('rec-form').addEventListener('submit', saveForm);
document.getElementById('rec-list').addEventListener('click', e => {
    var ed = e.target.closest('[data-edit]');
    if (ed) {
        var it = items.find(x => x.id === ed.dataset.edit);
        if (it) openForm(it);
        return;
    }
    var tg = e.target.closest('[data-toggle]');
    if (tg) toggleActive(tg.dataset.toggle);
});

Api.requireToken('週期性花費', enterApp);
