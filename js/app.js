import { BT, RU, STYLE_ORDER, STYLE_RU } from './data/constants.js';
import { fmt, parseT, parseEventInfo } from './helpers/utils.js';
import { Calculator } from './core/Calculator.js';
import { StorageManager } from './core/Storage.js';
import { ShareManager } from './ui/Share.js';
import { PWAInstall } from './ui/PWAInstall.js';
import { Onboarding } from './ui/Onboarding.js';
import { syncNativeChrome } from './ui/NativeChrome.js';
import { trackGoal } from './helpers/analytics.js';

class App {
    constructor() {
        this.state = {
            pool: 'SCM',
            gender: 'Men',
            curStyle: 'Freestyle',
            curEvent: '',
            curMode: 'time',
            favs: StorageManager.getFavs()
        };

        // Восстановление из избранного кликает по кнопкам программно —
        // такие клики целями не считаем
        this._restoring = false;

        this.initDOM();
        this.bindEvents();
        this.initTheme();
        this.initKeyboardMode();
        this.renderFavs();
        this.fillEvents();
        this.applyModeFromUrl();

        const pwa = new PWAInstall();
        pwa.init();

        // Onboarding for first-time users
        setTimeout(() => {
            const onboarding = new Onboarding();
            onboarding.init();
        }, 800);
    }

    $ = id => document.getElementById(id);

    // Ярлыки манифеста ведут на /?mode=time и /?mode=points. Раньше параметр никто
    // не читал, и оба ярлыка открывали режим «Время → Очки» — то есть ярлык
    // «Очки → Время» обещал то, чего не делал.
    // Жмём кнопку программно, а не правим state напрямую: у сегмента на клике
    // висит переключение форм и подсветка активного. Флаг _restoring гасит цель
    // Метрики — это не выбор пользователя.
    applyModeFromUrl() {
        const mode = new URLSearchParams(location.search).get('mode');
        if (mode !== 'time' && mode !== 'points') return;
        if (mode === this.state.curMode) return;

        this._restoring = true;
        document.querySelector(`.mode-seg .seg-btn[data-mode="${mode}"]`)?.click();
        this._restoring = false;
    }

    goal(name, params) {
        if (this._restoring) return;
        trackGoal(name, params);
    }

    initDOM() {
        const get = id => this.$(id);
        this.styleGrid = get('style-grid');
        this.grid = get('event-grid');
        this.fTime = get('f-time');
        this.fPts = get('f-pts');
        this.tM = get('t-m');
        this.tS = get('t-s');
        this.tH = get('t-h');
        this.tQ = get('t-quick');
        this.rPts = get('r-pts');
        this.rPtsV = get('r-pts-v');
        this.rPtsWr = get('r-pts-wr');
        this.favPts = get('fav-pts');
        this.rPtsRank = get('r-pts-rank');
        this.pIn = get('p-in');
        this.rTime = get('r-time');
        this.rTimeV = get('r-time-v');
        this.rTimeWr = get('r-time-wr');
        this.favTime = get('fav-time');
        this.rTimeRank = get('r-time-rank');
        this.histList = get('history-list');
        this.favToggle = get('fav-toggle');
        this.historySection = get('history-section');

        this.sharePtsBtn = get('share-pts');
        this.shareTimeBtn = get('share-time');
        this.toastEl = get('toast');
        this.authorExit = get('author-exit');
        this.qrBtn = get('qr-btn');

        this.themeToggle = get('theme-toggle');
        this.metaThemeColor = get('meta-theme-color');
    }

    bindEvents() {
        if (this.themeToggle) {
            this.themeToggle.onclick = () => {
                const cur = document.documentElement.getAttribute('data-theme');
                const next = cur === 'dark' ? 'light' : 'dark';
                this.goal('theme_toggle', { lik: next });
                this.setTheme(next, true);
            };
        }

        if (this.fTime) {
            this.setupSeg('.row [aria-labelledby="pool-label"]', 'pool', v => { this.state.pool = v; this.fillEvents(); }, 'select_pool');
            this.setupSeg('.row [aria-labelledby="gender-label"]', 'gender', v => { this.state.gender = v; this.fillEvents(); }, 'select_gender');

            document.querySelectorAll('.mode-seg .seg-btn').forEach(b => b.onclick = () => {
                document.querySelectorAll('.mode-seg .seg-btn').forEach(x => { x.classList.remove('active'); x.setAttribute('aria-checked', 'false'); });
                b.classList.add('active'); b.setAttribute('aria-checked', 'true');
                this.goal('switch_mode', { mode: b.dataset.mode });
                this.state.curMode = b.dataset.mode;
                if (this.fTime) this.fTime.classList.toggle('hidden', this.state.curMode !== 'time');
                if (this.fPts) this.fPts.classList.toggle('hidden', this.state.curMode !== 'points');
            });

            this.fTime.onsubmit = e => { e.preventDefault(); if (document.activeElement?.tagName === 'INPUT') document.activeElement.blur(); };
            if (this.fPts) this.fPts.onsubmit = e => { e.preventDefault(); if (document.activeElement?.tagName === 'INPUT') document.activeElement.blur(); };

            [this.tM, this.tS, this.tH].forEach((f, i, a) => {
                if (!f) return;
                f.oninput = () => {
                    f.value = f.value.replace(/\D/g, '').slice(0, 2);
                    if (this.tQ) this.tQ.value = '';
                    if (f.value.length === 2 && i < a.length - 1 && a[i + 1]) { a[i + 1].focus(); a[i + 1].select(); }
                    this.autoCalcPoints();
                };
                f.onkeyup = e => { if (e.key === 'Enter' || e.keyCode === 13) f.blur(); };
            });

            if (this.tQ) {
                this.bindInputFilter(this.tQ, /[0-9:.,]/, value => value.replace(/[^0-9:.,]/g, ''));
                this.tQ.oninput = () => { 
                    this.tQ.value = this.sanitizeTimeInput(this.tQ.value);
                    if (this.tM) this.tM.value = ''; 
                    if (this.tS) this.tS.value = ''; 
                    if (this.tH) this.tH.value = ''; 
                    this.autoCalcPoints(); 
                };
                this.tQ.onkeyup = e => { if (e.key === 'Enter' || e.keyCode === 13) this.tQ.blur(); };
            }
            if (this.pIn) {
                this.bindInputFilter(this.pIn, /[0-9]/, value => value.replace(/\D/g, '').slice(0, 4));
                this.pIn.oninput = () => { 
                    this.pIn.value = this.sanitizePointsInput(this.pIn.value);
                    this.autoCalcTime(); 
                };
                this.pIn.onkeyup = e => { if (e.key === 'Enter' || e.keyCode === 13) this.pIn.blur(); };
            }
        }

        if (this.favPts) this.favPts.onclick = () => {
            if (!this.rPts || !this.rPts.classList.contains('ok')) return;
            let t = (this.tQ && this.tQ.value.trim()) ? parseT(this.tQ.value) : this.fieldT();
            this.toggleFav(fmt(t), RU[this.state.curEvent] || this.state.curEvent, `${this.rPtsV.textContent} очк.`, {
                mode: this.state.curMode, pool: this.state.pool, gender: this.state.gender, eventKey: this.state.curEvent, value: t
            });
        };

        if (this.favTime) this.favTime.onclick = () => {
            if (!this.rTime || !this.rTime.classList.contains('ok')) return;
            this.toggleFav(`${this.pIn.value} очк.`, RU[this.state.curEvent] || this.state.curEvent, this.rTimeV.textContent, {
                mode: this.state.curMode, pool: this.state.pool, gender: this.state.gender, eventKey: this.state.curEvent, value: +this.pIn.value
            });
        };

        if (this.$('clear-history')) {
            this.$('clear-history').onclick = () => {
                this.goal('clear_favorites');
                this.state.favs = [];
                StorageManager.clearFavs();
                this.renderFavs();
            };
        }

        if (this.favToggle) {
            this.favToggle.onclick = () => {
                this.goal('toggle_favorites');
                if (!this.historySection) return;
                const collapsed = this.historySection.classList.toggle('collapsed');
                this.favToggle.setAttribute('aria-expanded', String(!collapsed));
            };
            this.favToggle.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') this.favToggle.click(); };
        }

        if (this.sharePtsBtn) this.sharePtsBtn.onclick = () => this.shareResult('pts');
        if (this.shareTimeBtn) this.shareTimeBtn.onclick = () => this.shareResult('time');

        if (this.qrBtn) this.qrBtn.onclick = () => this.goal('open_qr');

        // Логотип перезагружает страницу. Раньше это был <a href="#"> с инлайновым
        // обработчиком: ссылка в никуда для краулера и мина под любой строгий CSP.
        const logo = document.getElementById('logo-reload');
        if (logo) logo.onclick = () => location.reload();

        if (this.authorExit) {
            this.authorExit.onclick = async (e) => {
                this.goal('to_site');
                const url = this.authorExit.href;
                const Browser = window.Capacitor?.Plugins?.Browser;
                if (!Browser?.open) return;

                // В нативной обёртке переход в той же вкладке подменил бы приложение
                e.preventDefault();
                try {
                    await Browser.open({ url });
                } catch (err) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            };
        }
    }

    bindInputFilter(input, allowedChar, sanitize) {
        input.addEventListener('beforeinput', (event) => {
            if (!event.data || event.inputType.startsWith('delete')) return;
            if (![...event.data].every(char => allowedChar.test(char))) {
                event.preventDefault();
            }
        });

        input.addEventListener('paste', () => {
            requestAnimationFrame(() => {
                input.value = sanitize(input.value);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });
    }

    sanitizeTimeInput(value) {
        return value.replace(/[^0-9:.,]/g, '');
    }

    sanitizePointsInput(value) {
        return value.replace(/\D/g, '').slice(0, 4);
    }

    setupSeg(sel, attr, cb, goalName) {
        document.querySelectorAll(`${sel} .seg-btn`).forEach(b => b.onclick = () => {
            document.querySelectorAll(`${sel} .seg-btn`).forEach(x => { x.classList.remove('active'); x.setAttribute('aria-checked', 'false'); });
            b.classList.add('active'); b.setAttribute('aria-checked', 'true');
            if (goalName) this.goal(goalName, { [attr]: b.dataset[attr] });
            cb(b.dataset[attr]);
        });
    }

    initTheme() {
        // Ключ сменён с fina_theme на fina_lik. Автопереключение убрано:
        // системная тема используется только как стартовое значение при первом
        // визите (когда ручной выбор ещё не сохранён); дальше — только toggle,
        // без слежения за live-изменениями prefers-color-scheme.
        try { localStorage.removeItem('fina_theme'); } catch (e) { }

        const saved = StorageManager.getTheme();
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        const initial = (saved === 'dark' || saved === 'light') ? saved : (prefersLight ? 'light' : 'dark');
        this.setTheme(initial);
    }

    setTheme(t, persist = false) {
        // Смена лика мгновенна — без transition-каскада на цветах
        const root = document.documentElement;
        root.classList.add('theme-switching');
        root.setAttribute('data-theme', t);
        void root.offsetHeight; // фиксируем новые цвета при выключенных transition
        root.classList.remove('theme-switching');
        if (this.metaThemeColor) this.metaThemeColor.content = t === 'light' ? '#fafafa' : '#0d0d0d';
        syncNativeChrome(t);
        if (persist) StorageManager.saveTheme(t);

        if (this.themeToggle) {
            const next = t === 'dark' ? 'Светлый лик' : 'Тёмный лик';
            this.themeToggle.title = next;
            this.themeToggle.setAttribute('aria-label', `Переключить тему: ${next}`);
        }
    }

    initKeyboardMode() {
        // Компактный режим — только на сенсорных устройствах и только когда
        // экранная клавиатура реально открыта (видимый viewport стал заметно ниже).
        // На десктопе фокус в поле ввода ничего не сжимает.
        const vv = window.visualViewport;
        const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        if (!vv || !isTouch) return;

        const root = document.documentElement;
        const keyboardFields = 'input[type="text"], input[type="number"], textarea';
        const KEYBOARD_MIN_HEIGHT = 140; // меньше — это схлопывание адресной строки, не клавиатура
        let baseHeight = Math.max(window.innerHeight, vv.height);

        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                baseHeight = Math.max(window.innerHeight, vv.height);
                update();
            }, 300);
        });

        const update = () => {
            if (vv.height > baseHeight) baseHeight = vv.height;
            const keyboardVisible = baseHeight - vv.height > KEYBOARD_MIN_HEIGHT;
            const fieldFocused = document.activeElement?.matches?.(keyboardFields);
            const open = keyboardVisible && fieldFocused;
            const wasOpen = root.classList.contains('keyboard-open');

            root.style.setProperty('--keyboard-app-height', `${Math.max(360, Math.floor(vv.height))}px`);
            root.classList.toggle('keyboard-open', open);

            if (open && !wasOpen) {
                setTimeout(() => {
                    const active = document.activeElement;
                    if (active?.matches?.(keyboardFields)) {
                        active.scrollIntoView({ block: 'center', inline: 'nearest' });
                    }
                }, 120);
            }
        };

        vv.addEventListener('resize', update);
        document.addEventListener('focusin', () => setTimeout(update, 100));
        document.addEventListener('focusout', () => setTimeout(update, 100));
    }

    fieldT() {
        const m = +this.tM.value || 0, s = +this.tS.value || 0, h = +this.tH.value || 0;
        return (m || s || h) ? m * 60 + s + h / 100 : NaN;
    }

    autoCalcPoints() {
        let t = this.tQ.value.trim() ? parseT(this.tQ.value) : NaN;
        if (isNaN(t)) t = this.fieldT();
        const b = Calculator.getBase(this.state.pool, this.state.gender, this.state.curEvent);
        const p = Calculator.calcPts(b, t);
        let val = isNaN(p) ? null : Math.floor(p);

        let isMax = false;
        if (val !== null && val > 9999) { val = 9999; isMax = true; }

        if (val !== null) {
            this.rPtsV.innerHTML = isMax ? `<span style="font-size:0.65em; opacity:0.6; font-weight:600; vertical-align:middle; margin-right:2px;">&gt;</span>9999` : val;
            if (!this._firedCalcTime) { this._firedCalcTime = true; trackGoal('calc_time_to_points'); }
        } else {
            this.rPtsV.innerHTML = '—';
        }
        this.rPts.classList.toggle('ok', val !== null);

        const rank = val !== null ? Calculator.getRank(this.state.pool, this.state.gender, this.state.curEvent, t) : "";
        this.rPtsRank.textContent = rank;
        this.rPtsRank.classList.toggle('show', !!rank);

        this.updateStars();
    }

    autoCalcTime() {
        const b = Calculator.getBase(this.state.pool, this.state.gender, this.state.curEvent);
        const p = +this.pIn.value;
        let t = Calculator.calcTime(b, p);
        if (isNaN(t)) {
            this.rTimeV.textContent = '—';
            this.rTime.classList.remove('ok');
            return;
        }

        t = Math.round(t * 100) / 100;
        while (Math.floor(Calculator.calcPts(b, t)) < p) {
            t -= 0.01; t = Math.round(t * 100) / 100;
        }
        while (t > 0.01 && Math.floor(Calculator.calcPts(b, t - 0.01)) === Math.floor(Calculator.calcPts(b, t))) {
            t -= 0.01; t = Math.round(t * 100) / 100;
        }

        this.rTimeV.textContent = fmt(t);
        this.rTime.classList.toggle('ok', true);
        if (!this._firedCalcPoints) { this._firedCalcPoints = true; trackGoal('calc_points_to_time'); }

        const rank = Calculator.getRank(this.state.pool, this.state.gender, this.state.curEvent, t);
        this.rTimeRank.textContent = rank;
        this.rTimeRank.classList.toggle('show', !!rank);

        this.updateStars();
    }

    fillEvents() {
        const { pool, gender } = this.state;
        const ev = BT[pool]?.[gender];
        this.styleGrid.innerHTML = '';
        this.grid.innerHTML = '';

        if (!ev) {
            this.styleGrid.innerHTML = '<span style="color:var(--slate);font-size:.8rem">—</span>';
            this.grid.innerHTML = '<span style="color:var(--slate);font-size:.8rem">—</span>';
            this.state.curEvent = '';
            return;
        }

        const keys = Object.keys(ev);
        const availableStyles = new Set();
        const styleEvents = {};

        keys.forEach(k => {
            const info = parseEventInfo(k);
            if (!info.style) return;
            availableStyles.add(info.style);
            if (!styleEvents[info.style]) styleEvents[info.style] = [];
            styleEvents[info.style].push({ key: k, info });
        });

        const sortedStyles = STYLE_ORDER.filter(s => availableStyles.has(s));

        if (!availableStyles.has(this.state.curStyle)) this.state.curStyle = sortedStyles.length > 0 ? sortedStyles[0] : '';
        if (!this.state.curStyle) return;

        sortedStyles.forEach(s => {
            const c = document.createElement('button');
            c.type = 'button';
            c.className = 'chip' + (s === this.state.curStyle ? ' active' : '');
            c.textContent = STYLE_RU[s] || s;
            c.setAttribute('role', 'radio');
            c.setAttribute('aria-checked', s === this.state.curStyle ? 'true' : 'false');
            c.onclick = () => {
                if (this.state.curStyle === s) return;
                this.goal('select_style', { style: s });
                this.state.curStyle = s;

                let newEvent = '';
                if (this.state.curEvent) {
                    const oldInfo = parseEventInfo(this.state.curEvent);
                    const matchingDist = styleEvents[s].find(e => e.info.dist === oldInfo.dist);
                    if (matchingDist) newEvent = matchingDist.key;
                }
                if (!newEvent && styleEvents[s].length > 0) newEvent = styleEvents[s][0].key;
                this.state.curEvent = newEvent;

                this.fillEvents();
            };
            this.styleGrid.appendChild(c);
        });

        const currentEvents = styleEvents[this.state.curStyle] || [];
        if (!currentEvents.some(e => e.key === this.state.curEvent)) {
            this.state.curEvent = currentEvents.length > 0 ? currentEvents[0].key : '';
        }

        currentEvents.forEach(e => {
            const k = e.key;
            const c = document.createElement('button');
            c.type = 'button';
            c.className = 'chip' + (k === this.state.curEvent ? ' active' : '');
            c.textContent = e.info.label;
            c.dataset.event = k;
            c.setAttribute('role', 'radio');
            c.setAttribute('aria-checked', k === this.state.curEvent ? 'true' : 'false');
            c.onclick = () => {
                this.goal('select_event', { event: k });
                this.state.curEvent = k;
                this.grid.querySelectorAll('.chip').forEach(x => { x.classList.remove('active'); x.setAttribute('aria-checked', 'false'); });
                c.classList.add('active'); c.setAttribute('aria-checked', 'true');
                this.triggerCalc();
            };
            this.grid.appendChild(c);
        });

        this.triggerCalc();
    }

    triggerCalc() {
        if (this.state.curMode === 'time') this.autoCalcPoints();
        else this.autoCalcTime();
        this.updateBaseTime();
    }

    // Базовое время, а не мировой рекорд: это и есть та секунда, из которой считается
    // ровно 1000 очков. Совпадает с рекордом на дату начала периода действия таблицы и
    // расходится с ним по мере того, как рекорды падают, поэтому названо честно.
    updateBaseTime() {
        const { pool, gender, curEvent } = this.state;
        const base = BT[pool]?.[gender]?.[curEvent];
        const text = base
            ? `1000 очков: <span class="wr-val">${fmt(base)}</span>`
            : '';
        if (this.rPtsWr) this.rPtsWr.innerHTML = text;
        if (this.rTimeWr) this.rTimeWr.innerHTML = text;
    }

    toggleFav(input, eventStr, resultStr, raw) {
        const { favs } = this.state;
        const idx = favs.findIndex(f => f.input === input && f.event === eventStr && f.result === resultStr);
        if (idx >= 0) {
            favs.splice(idx, 1);
        } else {
            favs.unshift({ input, event: eventStr, result: resultStr, raw, id: Date.now() });
            if (favs.length > 30) favs.pop();
            trackGoal('add_favorite');
        }
        StorageManager.saveFavs(favs);
        this.renderFavs();
        this.updateStars();
    }

    updateStars() {
        const { favs, curEvent } = this.state;
        if (this.rPts.classList.contains('ok')) {
            let t = this.tQ.value.trim() ? parseT(this.tQ.value) : this.fieldT();
            const inputStr = fmt(t);
            const eventStr = RU[curEvent] || curEvent;
            const resultStr = `${this.rPtsV.textContent} очк.`;
            this.favPts.classList.toggle('saved', favs.some(f => f.input === inputStr && f.event === eventStr && f.result === resultStr));
        } else {
            this.favPts.classList.remove('saved');
        }

        if (this.rTime.classList.contains('ok')) {
            const inputStr = `${this.pIn.value} очк.`;
            const eventStr = RU[curEvent] || curEvent;
            const resultStr = this.rTimeV.textContent;
            this.favTime.classList.toggle('saved', favs.some(f => f.input === inputStr && f.event === eventStr && f.result === resultStr));
        } else {
            this.favTime.classList.remove('saved');
        }
    }

    renderFavs() {
        this.histList.innerHTML = '';
        this.state.favs.forEach(h => {
            const div = document.createElement('div');
            div.className = 'history-item';

            if (h.raw) {
                div.style.cursor = 'pointer';
                div.onclick = () => {
                    this.goal('restore_favorite');
                    this.loadState(h.raw);
                };
            }

            // Старые записи могли сохраняться с эмодзи-префиксом — убираем его при выводе
            const inputStr = String(h.input).replace(/^[^\d]+/, '');
            div.innerHTML = `<div class="hi-body"><span class="hi-event">${h.event}</span><span><span class="hi-input">${inputStr}</span><span class="hi-arrow">→</span><span class="hi-result">${h.result}</span></span></div><button type="button" class="hi-del" aria-label="Удалить" data-id="${h.id}">&times;</button>`;
            this.histList.appendChild(div);
        });

        document.querySelectorAll('.hi-del').forEach(btn => btn.onclick = (e) => {
            e.stopPropagation();
            this.goal('delete_favorite');
            this.state.favs = this.state.favs.filter(x => x.id !== +btn.dataset.id);
            StorageManager.saveFavs(this.state.favs);
            this.renderFavs();
            this.updateStars();
        });
    }

    loadState(raw) {
        if (!raw) return;

        this._restoring = true;
        document.querySelector(`[data-pool="${raw.pool}"]`)?.click();
        document.querySelector(`[data-gender="${raw.gender}"]`)?.click();
        document.querySelector(`.mode-seg .seg-btn[data-mode="${raw.mode}"]`)?.click();
        this._restoring = false;

        this.state.curEvent = raw.eventKey;
        if (this.state.curEvent) {
            const info = parseEventInfo(this.state.curEvent);
            if (info && info.style) {
                this.state.curStyle = info.style;
            }
        }

        this.fillEvents();

        if (raw.mode === 'time') {
            this.tM.value = ''; this.tS.value = ''; this.tH.value = '';
            this.tQ.value = fmt(raw.value);
            this.autoCalcPoints();
        } else {
            this.pIn.value = raw.value;
            this.autoCalcTime();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showToast(msg) {
        this.toastEl.textContent = msg;
        this.toastEl.classList.add('show');
        setTimeout(() => this.toastEl.classList.remove('show'), 2000);
    }

    shareResult(type) {
        trackGoal('share_result', { type });
        const { curEvent, pool } = this.state;
        let timeStr, ptsStr, rank = "";
        const eventStr = RU[curEvent] || curEvent;

        if (type === 'time') {
            timeStr = this.rTimeV.textContent;
            ptsStr = this.pIn.value;
            rank = this.rTimeRank.textContent;
        } else {
            ptsStr = this.rPtsV.textContent;
            timeStr = fmt(this.fieldT() || parseT(this.tQ.value));
            rank = this.rPtsRank.textContent;
        }

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const themeConfig = { pool, isLight, primary: type };
        ShareManager.shareResult({ timeStr, ptsStr, eventStr, rank, themeConfig }, (msg) => this.showToast(msg));
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new App();

    document.addEventListener("pointerdown", (e) => {
        const active = document.activeElement;
        if (!active) return;
        const tag = active.tagName;
        const isField =
            (tag === "INPUT" && !["button", "submit", "checkbox", "radio", "file", "reset"].includes(active.type)) ||
            tag === "TEXTAREA" ||
            tag === "SELECT";
        if (!isField) return;
        if (active.contains(e.target) || active === e.target) return;
        if (e.target.closest("input, textarea, select, button, label, a")) return;
        active.blur();
    });
});
