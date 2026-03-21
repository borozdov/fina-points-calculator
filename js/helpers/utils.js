import { RU } from '../data/constants.js';

export function parseEventInfo(k) {
    const m = k.match(/^(\d+)m (.*)$/);
    return { style: m ? m[2] : '', dist: m ? m[1] : '', label: m ? (m[1] + 'м') : k };
}

export function fmt(s) {
    if (s < 0 || !isFinite(s)) return '—';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60), h = Math.round((s % 1) * 100);
    return m > 0
        ? `${m}:${String(sec).padStart(2, '0')}.${String(h).padStart(2, '0')}`
        : `${sec}.${String(h).padStart(2, '0')}`;
}

export function parseT(s) {
    s = s.trim(); if (!s) return NaN;
    let m;
    if ((m = s.match(/^(\d{1,2}):(\d{1,2})(?:[.,](\d{1,2}))?$/)))
        return +m[1] * 60 + +m[2] + (m[3] ? parseInt(m[3].padEnd(2, '0')) / 100 : 0);
    if ((m = s.match(/^(\d+)[.,](\d{1,2})$/)))
        return +m[1] + parseInt(m[2].padEnd(2, '0')) / 100;
    if ((m = s.match(/^(\d+)$/))) {
        if (m[1].length <= 2) return +m[1];
        const p = m[1].padStart(6, '0');
        return +p.slice(0, 2) * 60 + +p.slice(2, 4) + +p.slice(4, 6) / 100;
    }
    return NaN;
}
