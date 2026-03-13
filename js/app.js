import { BT, RU, STYLE_ORDER, STYLE_RU } from './data/constants.js';
import { WR } from './data/world_records.js';
import { fmt, parseT, parseEventInfo } from './helpers/utils.js';
import { Calculator } from './core/Calculator.js';
import { StorageManager } from './core/Storage.js';
import { ShareManager } from './ui/Share.js';
import { PWAInstall } from './ui/PWAInstall.js';
import { Onboarding } from './ui/Onboarding.js';

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

        this.initDOM();
        this.bindEvents();
        this.initTheme();
        this.renderFavs();
        this.fillEvents();

        const pwa = new PWAInstall();
        pwa.init();

        // Onboarding for first-time users
        setTimeout(() => {
            const onboarding = new Onboarding();
            onboarding.init();
        }, 800);
    }

    $ = id => document.getElementById(id);

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

        this.themeToggle = get('theme-toggle');
        this.themeIcon = get('theme-icon');
        this.colorToggle = get('color-toggle');
        this.colorPicker = get('color-picker');
    }

    bindEvents() {
        if (this.themeToggle) {
            this.themeToggle.onclick = () => {
                const cur = document.documentElement.getAttribute('data-theme');
                this.setTheme(cur === 'dark' ? 'light' : 'dark');
            };
        }

        if (this.colorToggle && this.colorPicker) {
            this.colorToggle.onclick = (e) => {
                e.stopPropagation();
                this.colorPicker.classList.toggle('hidden');
            };
            
            // Close color picker when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.colorPicker.classList.contains('hidden') && 
                    !this.colorPicker.contains(e.target) && 
                    e.target !== this.colorToggle) {
                    this.colorPicker.classList.add('hidden');
                }
            });

            this.colorPicker.querySelectorAll('.color-dot').forEach(d => {
                d.onclick = (e) => {
                    e.stopPropagation();
                    this.setAccent(d.dataset.color);
                    this.colorPicker.classList.add('hidden');
                };
            });
        }

        if (this.fTime) {
            this.setupSeg('.row [aria-labelledby="pool-label"]', 'pool', v => { this.state.pool = v; this.fillEvents(); });
            this.setupSeg('.row [aria-labelledby="gender-label"]', 'gender', v => { this.state.gender = v; this.fillEvents(); });

            document.querySelectorAll('.mode-seg .seg-btn').forEach(b => b.onclick = () => {
                document.querySelectorAll('.mode-seg .seg-btn').forEach(x => { x.classList.remove('active'); x.setAttribute('aria-checked', 'false'); });
                b.classList.add('active'); b.setAttribute('aria-checked', 'true');
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
                f.onkeydown = e => { if (e.key === 'Enter') f.blur(); };
            });

            if (this.tQ) {
                this.tQ.oninput = () => { 
                    if (this.tM) this.tM.value = ''; 
                    if (this.tS) this.tS.value = ''; 
                    if (this.tH) this.tH.value = ''; 
                    this.autoCalcPoints(); 
                };
                this.tQ.onkeydown = e => { if (e.key === 'Enter') this.tQ.blur(); };
            }
            if (this.pIn) {
                this.pIn.oninput = () => { 
                    if (this.pIn.value.length > 4) this.pIn.value = this.pIn.value.slice(0, 4); 
                    this.autoCalcTime(); 
                };
                this.pIn.onkeydown = e => { if (e.key === 'Enter') this.pIn.blur(); };
            }
        }

        if (this.favPts) this.favPts.onclick = () => {
            if (!this.rPts || !this.rPts.classList.contains('ok')) return;
            let t = (this.tQ && this.tQ.value.trim()) ? parseT(this.tQ.value) : this.fieldT();
            this.toggleFav(`⏱ ${fmt(t)}`, RU[this.state.curEvent] || this.state.curEvent, `${this.rPtsV.textContent} очк.`, {
                mode: this.state.curMode, pool: this.state.pool, gender: this.state.gender, eventKey: this.state.curEvent, value: t
            });
        };

        if (this.favTime) this.favTime.onclick = () => {
            if (!this.rTime || !this.rTime.classList.contains('ok')) return;
            this.toggleFav(`🎯 ${this.pIn.value} очк.`, RU[this.state.curEvent] || this.state.curEvent, this.rTimeV.textContent, {
                mode: this.state.curMode, pool: this.state.pool, gender: this.state.gender, eventKey: this.state.curEvent, value: +this.pIn.value
            });
        };

        if (this.$('clear-history')) {
            this.$('clear-history').onclick = () => {
                this.state.favs = [];
                StorageManager.clearFavs();
                this.renderFavs();
            };
        }

        if (this.favToggle) {
            this.favToggle.onclick = () => this.historySection && this.historySection.classList.toggle('collapsed');
            this.favToggle.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') this.favToggle.click(); };
        }

        if (this.sharePtsBtn) this.sharePtsBtn.onclick = () => this.shareResult('pts');
        if (this.shareTimeBtn) this.shareTimeBtn.onclick = () => this.shareResult('time');
    }

    setupSeg(sel, attr, cb) {
        document.querySelectorAll(`${sel} .seg-btn`).forEach(b => b.onclick = () => {
            document.querySelectorAll(`${sel} .seg-btn`).forEach(x => { x.classList.remove('active'); x.setAttribute('aria-checked', 'false'); });
            b.classList.add('active'); b.setAttribute('aria-checked', 'true');
            cb(b.dataset[attr]);
        });
    }

    initTheme() {
        const savedTheme = StorageManager.getTheme();
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
            this.setTheme(prefersLight ? 'light' : 'dark');
        }
        this.setAccent(StorageManager.getAccent() || 'mono');
    }

    setTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        this.themeIcon.textContent = t === 'dark' ? '🌙' : '☀️';
        StorageManager.saveTheme(t);
    }

    setAccent(c) {
        document.documentElement.setAttribute('data-accent', c);
        StorageManager.saveAccent(c);
        this.colorPicker.querySelectorAll('.color-dot').forEach(d => {
            d.classList.toggle('active', d.dataset.color === c);
        });
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
            this.styleGrid.innerHTML = '<span style="color:var(--dim);font-size:.8rem">—</span>';
            this.grid.innerHTML = '<span style="color:var(--dim);font-size:.8rem">—</span>';
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
        this.updateWR();
    }

    updateWR() {
        const { pool, gender, curEvent } = this.state;
        const record = WR[pool]?.[gender]?.[curEvent];
        const text = record ? `WR: <span class="wr-val">${fmt(record)}</span>` : '';
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
        }
        StorageManager.saveFavs(favs);
        this.renderFavs();
        this.updateStars();
    }

    updateStars() {
        const { favs, curEvent } = this.state;
        if (this.rPts.classList.contains('ok')) {
            let t = this.tQ.value.trim() ? parseT(this.tQ.value) : this.fieldT();
            const inputStr = `⏱ ${fmt(t)}`;
            const eventStr = RU[curEvent] || curEvent;
            const resultStr = `${this.rPtsV.textContent} очк.`;
            this.favPts.classList.toggle('saved', favs.some(f => f.input === inputStr && f.event === eventStr && f.result === resultStr));
        } else {
            this.favPts.classList.remove('saved');
        }

        if (this.rTime.classList.contains('ok')) {
            const inputStr = `🎯 ${this.pIn.value} очк.`;
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
                div.onclick = () => this.loadState(h.raw);
            }

            div.innerHTML = `<div class="hi-body"><span class="hi-event">${h.event}</span><span><span>${h.input}</span><span class="hi-arrow">→</span><span class="hi-result">${h.result}</span></span></div><button type="button" class="hi-del" aria-label="Удалить" data-id="${h.id}">✕</button>`;
            this.histList.appendChild(div);
        });

        document.querySelectorAll('.hi-del').forEach(btn => btn.onclick = (e) => {
            e.stopPropagation();
            this.state.favs = this.state.favs.filter(x => x.id !== +btn.dataset.id);
            StorageManager.saveFavs(this.state.favs);
            this.renderFavs();
            this.updateStars();
        });
    }

    loadState(raw) {
        if (!raw) return;

        document.querySelector(`[data-pool="${raw.pool}"]`)?.click();
        document.querySelector(`[data-gender="${raw.gender}"]`)?.click();
        document.querySelector(`.mode-seg .seg-btn[data-mode="${raw.mode}"]`)?.click();

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
        let acHex = getComputedStyle(document.documentElement).getPropertyValue('--ac').trim();
        if (!acHex.startsWith('#')) {
            acHex = isLight ? '#a855f7' : '#c8a2ff';
        }

        const themeConfig = { pool, isLight, acHex };
        ShareManager.shareResult({ timeStr, ptsStr, eventStr, rank, themeConfig }, (msg) => this.showToast(msg));
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new App();
});
