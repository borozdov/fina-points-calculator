const METRIKA_ID = 107084687;

export function trackGoal(name, params) {
    try {
        if (typeof window.ym === 'function') window.ym(METRIKA_ID, 'reachGoal', name, params);
    } catch (e) { /* ignore */ }
}
