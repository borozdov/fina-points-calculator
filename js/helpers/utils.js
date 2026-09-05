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

/*
  Адрес страницы этой же дистанции на razryad.borozdov.ru.

  Нормативы ЕВСК есть у обоих сайтов, и это дубль. Вместо того чтобы делить между ними
  одну выдачу, плашка разряда ведёт туда: таблицы, страницы дистанций и всё со словами
  «разряд» и «норматив» — там, очки — здесь. Дубль превращается в перелинковку.

  Наборы событий у двух сайтов совпадают: оба идут от приказа № 1092.
*/
const RANK_STROKE = {
    Freestyle: 'free',
    Backstroke: 'back',
    Breaststroke: 'breast',
    Butterfly: 'fly',
    Medley: 'medley'
};

const STROKE_BY_SLUG = Object.fromEntries(Object.entries(RANK_STROKE).map(([k, v]) => [v, k]));

export function rankSiteUrl(pool, eventKey) {
    const m = String(eventKey || '').match(/^(\d+)m (.*)$/);
    const stroke = m && RANK_STROKE[m[2]];
    if (!stroke) return null;
    return `https://razryad.borozdov.ru/normativy/${pool.toLowerCase()}/${stroke}/${m[1]}/`;
}

/*
  Результат как адрес.

  До этого в URL жил только ?mode=, а кнопка «поделиться» отправляла голый
  https://fina.borozdov.ru — получатель открывал пустой калькулятор и не видел того, чем
  с ним поделились. Словарь тот же, что у адресов страниц: pool, stroke, дистанция.

  Форма состояния совпадает с той, что уже умеет loadState (избранное восстанавливается ею
  же), поэтому ссылка не заводит второго способа описать результат.
*/
export function resultQuery(raw) {
    const m = String(raw?.eventKey || '').match(/^(\d+)m (.*)$/);
    if (!m || !RANK_STROKE[m[2]] || !raw.value) return null;
    const params = new URLSearchParams({
        pool: raw.pool.toLowerCase(),
        sex: raw.gender === 'Women' ? 'f' : 'm',
        stroke: RANK_STROKE[m[2]],
        d: m[1],
        mode: raw.mode
    });
    params.set(raw.mode === 'time' ? 't' : 'p', String(raw.value));
    return params.toString();
}

/** Null для всего, чего словарь не покрывает: битая ссылка открывает калькулятор как обычно. */
export function resultFromQuery(search) {
    const q = new URLSearchParams(search);
    const pool = q.get('pool') === 'lcm' ? 'LCM' : q.get('pool') === 'scm' ? 'SCM' : null;
    const stroke = STROKE_BY_SLUG[q.get('stroke')];
    const distance = q.get('d');
    const mode = q.get('mode') === 'points' ? 'points' : 'time';
    const value = Number(q.get(mode === 'time' ? 't' : 'p'));
    if (!pool || !stroke || !distance || !Number.isFinite(value) || value <= 0) return null;
    return {
        pool,
        gender: q.get('sex') === 'f' ? 'Women' : 'Men',
        mode,
        eventKey: `${distance}m ${stroke}`,
        value
    };
}
