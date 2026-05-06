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

    const weeknights = countWeeknightsInRange(overlapStart, overlapEnd);
    const weekends = countWeekendsInRange(overlapStart, overlapEnd);

    return {
        weeknightTarget: Math.round(weeknights * 0.2),
        weekendTarget: Math.round(weekends * 0.25)
    };
}
