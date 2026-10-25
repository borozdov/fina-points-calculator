import { BT, STD_MAP, RANKS } from '../data/constants.js';
import { parseT } from '../helpers/utils.js';
import { STANDARDS } from '../data/standards.js';

export class Calculator {
    static getBase(pool, gender, eventKey) {
        const e = BT[pool]?.[gender];
        return (e && eventKey) ? (e[eventKey] ?? NaN) : NaN;
    }

    static calcPts(b, t) {
        return (t > 0 && isFinite(t) && isFinite(b)) ? 1000 * Math.pow(b / t, 3) : NaN;
    }

    static calcTime(b, p) {
        return (p > 0 && isFinite(p) && isFinite(b)) ? b / Math.pow(p / 1000, 1 / 3) : NaN;
    }

    /** Нормативы дистанции как [разряд, секунды], от МСМК к III юн; пусто, если их нет. */
    static getStandards(pool, gender, eventKey) {
        if (!eventKey || gender === 'Mixed' || typeof STANDARDS === 'undefined') return [];
        const gKey = gender.toLowerCase();
        const pKey = pool === 'SCM' ? '25m' : '50m';

        if (eventKey.includes('x')) return []; // no relays
        const m = eventKey.match(/^(\d+)m (.*)$/);
        if (!m || !STD_MAP[m[2]]) return [];

        const eKey = `${m[1]}, ${STD_MAP[m[2]]}`;
        const ranks = STANDARDS?.[gKey]?.[pKey]?.[eKey];
        if (!ranks) return [];
        return RANKS.filter(r => ranks[r]).map(r => [r, parseT(ranks[r])]);
    }

    static getRank(pool, gender, eventKey, t) {
        if (isNaN(t) || t <= 0) return "";
        const met = Calculator.getStandards(pool, gender, eventKey).find(([, rt]) => t <= rt);
        return met ? met[0] : "";
    }

    /*
      Ближайший разряд, которого время ещё не закрывает, и его норматив. Как на
      razryad.borozdov.ru: самый медленный из невыполненных. Null, когда закрыт МСМК
      или нормативов у дистанции нет.
    */
    static getNextRank(pool, gender, eventKey, t) {
        if (isNaN(t) || t <= 0) return null;
        const next = Calculator.getStandards(pool, gender, eventKey).reverse().find(([, rt]) => rt < t);
        return next ? { rank: next[0], time: next[1] } : null;
    }
}
