import { test, assertDeepEq, assertEq, assertTrue, assertFalse } from './test-runner.js';
import { calculateTraineeTargets, countWeeknightsInRange, countWeekendsInRange } from '../lib/trainee-logic.js';

// April 2026: 30 days. Weekdays: Wed 1, Thu 2, Fri 3 (PH but still weeknight slot),
// then 6-10, 13-17, 20-24, 27-30. Total weeknights = 22.
// Weekends (Sat-Sun pairs starting Sat): 4-5, 11-12, 18-19, 25-26 = 4 weekends.

test('countWeeknightsInRange: full April 2026', () => {
    const start = new Date(2026, 3, 1); // April 1
    const end = new Date(2026, 3, 30);  // April 30
    assertEq(countWeeknightsInRange(start, end), 22);
});

test('countWeekendsInRange: full April 2026', () => {
    const start = new Date(2026, 3, 1);
    const end = new Date(2026, 3, 30);
    assertEq(countWeekendsInRange(start, end), 4);
});

test('calculateTraineeTargets: full April 2026 (4 weekend blocks)', () => {
    const trainee = { code: 'MP', rotationStart: '2026-01-01', rotationEnd: '2027-01-31' };
    const result = calculateTraineeTargets(trainee, 2026, 3); // April
    // 4 weekend blocks → 1 weekend + 3 weeknights
    assertDeepEq(result, { weeknightTarget: 3, weekendTarget: 1 });
});

test('calculateTraineeTargets: half-month (April 15 on) → 2 weekend blocks', () => {
    const trainee = { code: 'MP', rotationStart: '2026-04-15', rotationEnd: '2026-06-30' };
    const result = calculateTraineeTargets(trainee, 2026, 3);
    // Weekends 18-19, 25-26 = 2 blocks → 1 weekend + 1 weeknight
    assertDeepEq(result, { weeknightTarget: 1, weekendTarget: 1 });
});

test('calculateTraineeTargets: rotation ends April 15 → 2 weekend blocks', () => {
    const trainee = { code: 'MP', rotationStart: '2026-03-01', rotationEnd: '2026-04-15' };
    const result = calculateTraineeTargets(trainee, 2026, 3);
    // Weekends 4-5, 11-12 = 2 blocks → 1 weekend + 1 weeknight
    assertDeepEq(result, { weeknightTarget: 1, weekendTarget: 1 });
});

test('calculateTraineeTargets: rotation does not overlap month', () => {
    const trainee = { code: 'MP', rotationStart: '2026-05-01', rotationEnd: '2026-06-30' };
    const result = calculateTraineeTargets(trainee, 2026, 3);
    assertDeepEq(result, { weeknightTarget: 0, weekendTarget: 0 });
});

import { planTraineeMonth } from '../lib/trainee-logic.js';

// Local month builder mirroring the generator's getWeekendBlocks/getWeekNights.
function key(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'),
          day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function buildMonth(year, month) {
    const weekends = [], weeknights = [];
    const last = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= last; day++) {
        const d = new Date(year, month, day);
        const dow = d.getDay();
        if (dow === 6) {
            const sun = new Date(year, month, day + 1);
            if (sun.getMonth() === month) weekends.push({ sat: d, sun, satKey: key(d), sunKey: key(sun) });
        } else if (dow >= 1 && dow <= 5) {
            weeknights.push(d);
        }
    }
    return { weekends, weeknights };
}
function weekMondayOf(satKey) {
    const [y, m, d] = satKey.split('-').map(Number);
    const sat = new Date(y, m - 1, d);
    const mon = new Date(sat); mon.setDate(sat.getDate() - 5);
    return key(mon);
}

test('planTraineeMonth: full July 2026 → 1 weekend + 3 weeknights, distinct weeks', () => {
    const { weekends, weeknights } = buildMonth(2026, 6); // July
    const trainee = { code: 'MP', rotationStart: '2026-01-01', rotationEnd: '2027-01-31' };
    const plan = planTraineeMonth(trainee, weekends, weeknights, () => false);

    assertTrue(weekends.some(b => b.satKey === plan.weekendKey), 'weekendKey is a real block');
    assertEq(plan.weeknightKeys.length, 3, 'three weeknights');

    const weekendWeekMon = weekMondayOf(plan.weekendKey);
    const weekMondays = plan.weeknightKeys.map(k => {
        const [y, m, d] = k.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const dow = date.getDay();            // 1..5
        const mon = new Date(date); mon.setDate(date.getDate() - (dow - 1));
        return key(mon);
    });
    assertFalse(weekMondays.includes(weekendWeekMon), 'no weeknight in her weekend week');
    assertEq(new Set(weekMondays).size, 3, 'weeknights in 3 distinct weeks');
});

test('planTraineeMonth: trainee unavailable all of one week still yields valid plan', () => {
    const { weekends, weeknights } = buildMonth(2026, 6);
    const trainee = { code: 'MP', rotationStart: '2026-01-01', rotationEnd: '2027-01-31' };
    const unavail = (code, d) => d.getDate() <= 5; // entire first calendar slice of July
    const plan = planTraineeMonth(trainee, weekends, weeknights, unavail);
    assertTrue(plan.weeknightKeys.every(k => Number(k.split('-')[2]) > 5), 'no assignment in blocked week');
});

test('planTraineeMonth: no overlap → empty plan', () => {
    const { weekends, weeknights } = buildMonth(2026, 6);
    const trainee = { code: 'MP', rotationStart: '2025-01-01', rotationEnd: '2025-12-31' };
    const plan = planTraineeMonth(trainee, weekends, weeknights, () => false);
    assertEq(plan.weekendKey, null);
    assertEq(plan.weeknightKeys.length, 0);
});
