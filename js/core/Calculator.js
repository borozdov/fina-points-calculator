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

    static getRank(pool, gender, eventKey, t) {
        if (!eventKey || isNaN(t) || t <= 0 || gender === 'Mixed' || typeof STANDARDS === 'undefined') return "";
        const gKey = gender.toLowerCase();
        const pKey = pool === 'SCM' ? '25m' : '50m';

        if (eventKey.includes('x')) return ""; // no relays
        const m = eventKey.match(/^(\d+)m (.*)$/);
        if (!m || !STD_MAP[m[2]]) return "";

        const eKey = `${m[1]}, ${STD_MAP[m[2]]}`;
        const ranks = STANDARDS?.[gKey]?.[pKey]?.[eKey];
        if (!ranks) return "";

        for (const r of RANKS) {
            if (ranks[r]) {
                const rt = parseT(ranks[r]);
                if (t <= rt) return r;
            }
        }
        return "";
    }
}
