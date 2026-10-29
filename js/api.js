'use strict';

// ── GAS API client（三個頁面共用）──────────────────────────────────────────────
// 所有請求以 GET 呼叫 APP_CONFIG.scriptReadUrl，並帶上存取碼 token。
// 存取碼存在 localStorage，每台裝置輸入一次；GAS 回 unauthorized 時清除並要求重新輸入。

const Api = (() => {
    const TOKEN_KEY = 'bookkeeping_token';

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || '';
    }

    function clearToken() {
        localStorage.removeItem(TOKEN_KEY);
    }

    function buildUrl(params, token) {
        const url = new URL(APP_CONFIG.scriptReadUrl);
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null) url.searchParams.set(k, v);
        });
        url.searchParams.set('token', token);
        return url;
    }

    // GAS 驗證失敗時回 JSON；範圍讀取成功時回逗號分隔純文字
    function isUnauthorized(text) {
        return text.startsWith('{') && text.includes('"unauthorized"');
    }

    async function request(params) {
        const res = await fetch(buildUrl(params, getToken()));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        if (isUnauthorized(text)) {
            clearToken();
            location.reload();   // 重新載入後會顯示存取碼畫面
            throw new Error('unauthorized');
        }
        return text;
    }

    /** 範圍讀取，回傳逗號分隔字串。 */
    function fetchSheet(params) {
        return request(params);
    }

    /** 呼叫 GAS action，回傳 JSON。 */
    async function action(name, extra) {
        return JSON.parse(await request(Object.assign({}, extra, { action: name })));
    }

    /** 登出：清除這台裝置的存取碼。 */
    function logout() {
        clearToken();
        location.reload();
    }

    /**
     * 確認已有存取碼後執行 onReady；沒有時顯示輸入畫面，驗證通過才繼續。
     */
    function requireToken(title, onReady) {
        if (getToken()) { onReady(); return; }

        const screen = document.createElement('div');
        screen.className = 'auth-screen';
        screen.innerHTML =
            '<div class="form-card auth-card">' +
            '<div class="form-card__header"><div class="form-card__title"></div></div>' +
            '<div class="form-card__body">' +
            '<div class="field-group">' +
            '<label class="field-label" for="auth-token">存取碼</label>' +
            '<input type="password" id="auth-token" placeholder="請輸入存取碼" autocomplete="current-password">' +
            '</div>' +
            // type=submit 只為套用主要按鈕樣式（不在 form 內，不會送出）
            '<div class="btn-row"><button type="submit" id="btn-auth">確認</button></div>' +
            '<p class="auth-hint">每台裝置只需輸入一次</p>' +
            '<p class="auth-error" id="auth-error"></p>' +
            '</div></div>';
        screen.querySelector('.form-card__title').textContent = title;
        document.body.appendChild(screen);
        document.body.classList.add('auth-locked');

        const input = screen.querySelector('#auth-token');
        const btn   = screen.querySelector('#btn-auth');
        const errEl = screen.querySelector('#auth-error');
        const card  = screen.querySelector('.auth-card');

        async function submit() {
            const token = input.value.trim();
            if (!token) return;
            btn.disabled = true;
            btn.textContent = '驗證中...';
            errEl.textContent = '';
            try {
                const res  = await fetch(buildUrl({ action: 'ping' }, token));
                const json = await res.json();
                if (json.result !== 'ok') throw new Error('bad token');
                localStorage.setItem(TOKEN_KEY, token);
                screen.remove();
                document.body.classList.remove('auth-locked');
                onReady();
            } catch {
                errEl.textContent = navigator.onLine ? '存取碼錯誤' : '網路連線已中斷';
                card.classList.remove('shake');
                void card.offsetWidth;
                card.classList.add('shake');
            } finally {
                btn.disabled = false;
                btn.textContent = '確認';
            }
        }

        btn.addEventListener('click', submit);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
        input.focus();
    }

    return { fetchSheet, action, logout, requireToken };
})();
