// Pure logic for trainee target calculation and assignment.
// Imported by generator.html (script type="module") and tests.

function parseISO(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function countWeeknightsInRange(start, end) {
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
        const dow = cur.getDay();
        if (dow >= 1 && dow <= 5) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

// Counts complete Sat-Sun pairs whose Saturday falls within [start, end] AND
// whose Sunday also falls within [start, end]. A dangling Saturday at end-of-range
// is not counted, since trainee weekend targets assume both days are coverable.
export function countWeekendsInRange(start, end) {
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
        if (cur.getDay() === 6) {
            const sun = new Date(cur);
            sun.setDate(sun.getDate() + 1);
            if (sun <= end) count++;
        }
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

export function calculateTraineeTargets(trainee, year, month) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const rotStart = parseISO(trainee.rotationStart);
    const rotEnd = parseISO(trainee.rotationEnd);

    const overlapStart = rotStart > monthStart ? rotStart : monthStart;
    const overlapEnd = rotEnd < monthEnd ? rotEnd : monthEnd;

    if (overlapStart > overlapEnd) {
        return { weeknightTarget: 0, weekendTarget: 0 };
    }

    // Weeks are anchored on full Sat-Sun weekend blocks in the overlap.
    // Rule: one on-call per week — exactly one week is the weekend, the rest
    // are a single weeknight each.
    const weeks = countWeekendsInRange(overlapStart, overlapEnd);
    if (weeks === 0) {
        // No full weekend in the window: one weeknight if any weeknights exist, else nothing.
        const wn = countWeeknightsInRange(overlapStart, overlapEnd);
        return { weeknightTarget: wn > 0 ? 1 : 0, weekendTarget: 0 };
    }
    return { weeknightTarget: weeks - 1, weekendTarget: 1 };
}

function fmtKey(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'),
          day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Mon-Fri of the same week as `sat` (i.e. the five days before it).
function inWeekOf(weeknight, sat) {
    const mon = new Date(sat); mon.setDate(sat.getDate() - 5);
    const fri = new Date(sat); fri.setDate(sat.getDate() - 1);
    return weeknight >= mon && weeknight <= fri;
}

// Plan a trainee's month: one weekend block + one weeknight in each other week.
// weekendBlocks = [{sat, sun, satKey, sunKey}], weeknights = [Date],
// isUnavailable(code, Date) = leave/ad-hoc check. Returns { weekendKey, weeknightKeys }.
export function planTraineeMonth(trainee, weekendBlocks, weeknights, isUnavailable) {
    const rs = parseISO(trainee.rotationStart).getTime();
    const re = parseISO(trainee.rotationEnd).getTime();
    const avail = (d) => {
        const t = d.getTime();
        return t >= rs && t <= re && !isUnavailable(trainee.code, d);
    };

    const weeknightTarget = Math.max(0, weekendBlocks.length - 1);

    // Weekend: a block where the trainee is free BOTH days. Pick the middle
    // candidate so she isn't always on the first weekend of the month.
    const candidates = weekendBlocks.filter(b => avail(b.sat) && avail(b.sun));
    let weekendKey = null;
    if (candidates.length > 0) {
        weekendKey = candidates[Math.floor((candidates.length - 1) / 2)].satKey;
    }

    // Weeknights: one per weekend-week, skipping her weekend's week.
    const weeknightKeys = [];
    let dowOffset = 0;
    for (const b of weekendBlocks) {
        if (weeknightKeys.length >= weeknightTarget) break;
        if (b.satKey === weekendKey) continue;
        const inWeek = weeknights.filter(d => inWeekOf(d, b.sat) && avail(d));
        if (inWeek.length === 0) continue;
        const chosen = inWeek[dowOffset % inWeek.length]; // rotate to spread day-of-week
        weeknightKeys.push(fmtKey(chosen));
        dowOffset++;
    }

    return { weekendKey, weeknightKeys };
}
