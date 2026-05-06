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
