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
