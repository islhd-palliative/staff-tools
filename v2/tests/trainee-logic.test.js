import { test, assertDeepEq, assertEq } from './test-runner.js';
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

test('calculateTraineeTargets: full-month rotation', () => {
    const trainee = { code: 'MP', rotationStart: '2026-04-01', rotationEnd: '2026-06-30' };
    const result = calculateTraineeTargets(trainee, 2026, 3); // April
    assertDeepEq(result, { weeknightTarget: 4, weekendTarget: 1 });
});

test('calculateTraineeTargets: half-month rotation (April 15 onwards)', () => {
    const trainee = { code: 'MP', rotationStart: '2026-04-15', rotationEnd: '2026-06-30' };
    const result = calculateTraineeTargets(trainee, 2026, 3);
    // Weeknights 15-30: 12. Weekends 18-19 + 25-26 = 2. Targets: round(12*0.2)=2, round(2*0.25)=1.
    assertDeepEq(result, { weeknightTarget: 2, weekendTarget: 1 });
});

test('calculateTraineeTargets: rotation ends mid-month', () => {
    const trainee = { code: 'MP', rotationStart: '2026-03-01', rotationEnd: '2026-04-15' };
    const result = calculateTraineeTargets(trainee, 2026, 3);
    // Weeknights 1-15: 11. Weekends 4-5 + 11-12 = 2. Targets: round(11*0.2)=2, round(2*0.25)=1.
    assertDeepEq(result, { weeknightTarget: 2, weekendTarget: 1 });
});

test('calculateTraineeTargets: rotation does not overlap month', () => {
    const trainee = { code: 'MP', rotationStart: '2026-05-01', rotationEnd: '2026-06-30' };
    const result = calculateTraineeTargets(trainee, 2026, 3);
    assertDeepEq(result, { weeknightTarget: 0, weekendTarget: 0 });
});

import { pickTraineeForDay } from '../lib/trainee-logic.js';

test('pickTraineeForDay: single active trainee under target', () => {
    const date = new Date(2026, 3, 7); // Tuesday
    const trainees = [{ code: 'MP', rotationStart: '2026-04-01', rotationEnd: '2026-06-30' }];
    const state = { 'MP': { weeknightAssigned: 0, weeknightTarget: 4, weekendAssigned: 0, weekendTarget: 1 } };
    const onLeave = () => false;
    assertEq(pickTraineeForDay(date, trainees, state, onLeave, false), 'MP');
});

test('pickTraineeForDay: trainee at target, returns null', () => {
    const date = new Date(2026, 3, 7);
    const trainees = [{ code: 'MP', rotationStart: '2026-04-01', rotationEnd: '2026-06-30' }];
    const state = { 'MP': { weeknightAssigned: 4, weeknightTarget: 4, weekendAssigned: 0, weekendTarget: 1 } };
    const onLeave = () => false;
    assertEq(pickTraineeForDay(date, trainees, state, onLeave, false), null);
});

test('pickTraineeForDay: trainee on leave that day, returns null', () => {
    const date = new Date(2026, 3, 17);
    const trainees = [{ code: 'MP', rotationStart: '2026-04-01', rotationEnd: '2026-06-30' }];
    const state = { 'MP': { weeknightAssigned: 0, weeknightTarget: 4, weekendAssigned: 0, weekendTarget: 1 } };
    const onLeave = (code, d) => code === 'MP' && d.getDate() === 17;
    assertEq(pickTraineeForDay(date, trainees, state, onLeave, false), null);
});

test('pickTraineeForDay: outside rotation period, returns null', () => {
    const date = new Date(2026, 2, 15);
    const trainees = [{ code: 'MP', rotationStart: '2026-04-01', rotationEnd: '2026-06-30' }];
    const state = { 'MP': { weeknightAssigned: 0, weeknightTarget: 4, weekendAssigned: 0, weekendTarget: 1 } };
    const onLeave = () => false;
    assertEq(pickTraineeForDay(date, trainees, state, onLeave, false), null);
});

test('pickTraineeForDay: two trainees, picks furthest below target', () => {
    const date = new Date(2026, 3, 7);
    const trainees = [
        { code: 'MP', rotationStart: '2026-04-01', rotationEnd: '2026-06-30' },
        { code: 'PL', rotationStart: '2026-04-01', rotationEnd: '2026-06-30' }
    ];
    const state = {
        'MP': { weeknightAssigned: 2, weeknightTarget: 4, weekendAssigned: 0, weekendTarget: 1 },
        'PL': { weeknightAssigned: 0, weeknightTarget: 4, weekendAssigned: 0, weekendTarget: 1 }
    };
    const onLeave = () => false;
    assertEq(pickTraineeForDay(date, trainees, state, onLeave, false), 'PL');
});

test('pickTraineeForDay: weekend day, picks based on weekend target', () => {
    const date = new Date(2026, 3, 25); // Saturday
    const trainees = [{ code: 'MP', rotationStart: '2026-04-01', rotationEnd: '2026-06-30' }];
    const state = { 'MP': { weeknightAssigned: 4, weeknightTarget: 4, weekendAssigned: 0, weekendTarget: 1 } };
    const onLeave = () => false;
    assertEq(pickTraineeForDay(date, trainees, state, onLeave, true), 'MP');
});
