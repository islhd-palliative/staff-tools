import { test, assertTrue, assertFalse, assertEq, assertDeepEq } from './test-runner.js';
import { isFullyOnLeave } from '../lib/directory.js';

const APR_2026 = { year: 2026, month: 3 };

test('isFullyOnLeave: no leave entries → false', () => {
    assertFalse(isFullyOnLeave('BT', [], APR_2026.year, APR_2026.month));
});

test('isFullyOnLeave: leave covers half the month → false', () => {
    const leave = [{ staffCode: 'BT', startDate: '2026-04-01', endDate: '2026-04-15' }];
    assertFalse(isFullyOnLeave('BT', leave, APR_2026.year, APR_2026.month));
});

test('isFullyOnLeave: single entry covers entire month → true', () => {
    const leave = [{ staffCode: 'BT', startDate: '2026-04-01', endDate: '2026-04-30' }];
    assertTrue(isFullyOnLeave('BT', leave, APR_2026.year, APR_2026.month));
});

test('isFullyOnLeave: leave extends beyond month, covers all of it → true', () => {
    const leave = [{ staffCode: 'BT', startDate: '2026-03-15', endDate: '2026-05-15' }];
    assertTrue(isFullyOnLeave('BT', leave, APR_2026.year, APR_2026.month));
});

test('isFullyOnLeave: two entries together cover the month → true', () => {
    const leave = [
        { staffCode: 'BT', startDate: '2026-04-01', endDate: '2026-04-15' },
        { staffCode: 'BT', startDate: '2026-04-16', endDate: '2026-04-30' }
    ];
    assertTrue(isFullyOnLeave('BT', leave, APR_2026.year, APR_2026.month));
});

test('isFullyOnLeave: gap between entries → false', () => {
    const leave = [
        { staffCode: 'BT', startDate: '2026-04-01', endDate: '2026-04-10' },
        { staffCode: 'BT', startDate: '2026-04-12', endDate: '2026-04-30' }
    ];
    assertFalse(isFullyOnLeave('BT', leave, APR_2026.year, APR_2026.month));
});

test('isFullyOnLeave: only other staff leave → false', () => {
    const leave = [{ staffCode: 'AL', startDate: '2026-04-01', endDate: '2026-04-30' }];
    assertFalse(isFullyOnLeave('BT', leave, APR_2026.year, APR_2026.month));
});

import { formatLeaveDates } from '../lib/directory.js';

test('formatLeaveDates: empty → empty string', () => {
    assertEq(formatLeaveDates([]), '');
});

test('formatLeaveDates: single date → "7"', () => {
    assertEq(formatLeaveDates([7]), '7');
});

test('formatLeaveDates: contiguous range → "7-13"', () => {
    assertEq(formatLeaveDates([7, 8, 9, 10, 11, 12, 13]), '7-13');
});

test('formatLeaveDates: discrete dates → "17, 23, 28"', () => {
    assertEq(formatLeaveDates([17, 23, 28]), '17, 23, 28');
});

test('formatLeaveDates: mix of range and discrete → "7-13, 17, 23"', () => {
    assertEq(formatLeaveDates([7, 8, 9, 10, 11, 12, 13, 17, 23]), '7-13, 17, 23');
});

test('formatLeaveDates: unsorted input is sorted', () => {
    assertEq(formatLeaveDates([23, 7, 17, 8, 9, 10, 11, 12, 13]), '7-13, 17, 23');
});

test('formatLeaveDates: two-date range → "7-8"', () => {
    assertEq(formatLeaveDates([7, 8]), '7-8');
});

import { buildDirectoryForMonth } from '../lib/directory.js';

const SAMPLE = {
    staff: [
        { code: 'BT', name: 'Benjamin Thomas', phone: '0423 518 466', region: 'North', workDays: [1,2,3,4,5] },
        { code: 'AL', name: 'Angela Lo', phone: '0404 088 162', region: 'North', workDays: [1,2,3,4,5] }
    ],
    trainees: [
        { code: 'MP', name: 'Michelle Petersen', phone: '0409 070 315', rotationStart: '2026-04-01', rotationEnd: '2026-06-30' }
    ],
    locum: { code: 'LOC', name: 'Ratnayake', phone: '0450 005 119' }
};

test('buildDirectoryForMonth: includes all SS not fully on leave', () => {
    const dir = buildDirectoryForMonth(SAMPLE.staff, SAMPLE.trainees, SAMPLE.locum, [], {}, 2026, 3);
    const codes = dir.map(d => d.code);
    assertTrue(codes.includes('BT'));
    assertTrue(codes.includes('AL'));
});

test('buildDirectoryForMonth: excludes SS fully on leave for the month', () => {
    const leave = [{ staffCode: 'AL', startDate: '2026-04-01', endDate: '2026-04-30' }];
    const dir = buildDirectoryForMonth(SAMPLE.staff, SAMPLE.trainees, SAMPLE.locum, leave, {}, 2026, 3);
    const codes = dir.map(d => d.code);
    assertTrue(codes.includes('BT'));
    assertFalse(codes.includes('AL'));
});

test('buildDirectoryForMonth: includes trainee whose rotation overlaps month', () => {
    const dir = buildDirectoryForMonth(SAMPLE.staff, SAMPLE.trainees, SAMPLE.locum, [], {}, 2026, 3);
    const mp = dir.find(d => d.code === 'MP');
    assertTrue(!!mp);
    assertEq(mp.role, 'Trainee');
});

test('buildDirectoryForMonth: excludes trainee whose rotation does not overlap', () => {
    const dir = buildDirectoryForMonth(SAMPLE.staff, SAMPLE.trainees, SAMPLE.locum, [], {}, 2026, 0);
    assertFalse(dir.some(d => d.code === 'MP'));
});

test('buildDirectoryForMonth: includes locum only when rostered ≥1 day that month', () => {
    const roster = { '2026-04-15': { first: 'LOC', second: null } };
    const dir = buildDirectoryForMonth(SAMPLE.staff, SAMPLE.trainees, SAMPLE.locum, [], roster, 2026, 3);
    assertTrue(dir.some(d => d.code === 'LOC'));
});

test('buildDirectoryForMonth: excludes locum when not rostered', () => {
    const roster = { '2026-04-15': { first: 'BT', second: null } };
    const dir = buildDirectoryForMonth(SAMPLE.staff, SAMPLE.trainees, SAMPLE.locum, [], roster, 2026, 3);
    assertFalse(dir.some(d => d.code === 'LOC'));
});

test('buildDirectoryForMonth: rows ordered SS (alpha by surname) → locum → trainees', () => {
    const roster = { '2026-04-15': { first: 'LOC', second: null } };
    const dir = buildDirectoryForMonth(SAMPLE.staff, SAMPLE.trainees, SAMPLE.locum, [], roster, 2026, 3);
    const order = dir.map(d => d.code);
    assertDeepEq(order, ['AL', 'BT', 'LOC', 'MP']);
});

test('buildDirectoryForMonth: leaveDates is array of day numbers within month', () => {
    const leave = [
        { staffCode: 'MP', startDate: '2026-04-17', endDate: '2026-04-17' },
        { staffCode: 'MP', startDate: '2026-04-23', endDate: '2026-04-23' },
        { staffCode: 'MP', startDate: '2026-04-28', endDate: '2026-04-28' }
    ];
    const dir = buildDirectoryForMonth(SAMPLE.staff, SAMPLE.trainees, SAMPLE.locum, leave, {}, 2026, 3);
    const mp = dir.find(d => d.code === 'MP');
    assertDeepEq(mp.leaveDates, [17, 23, 28]);
});
