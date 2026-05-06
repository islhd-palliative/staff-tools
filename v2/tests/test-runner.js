// Tiny browser-side test harness. No dependencies.
// Usage:
//   import { test, assertEq, assertDeepEq, run } from './test-runner.js';
//   test('description', () => { assertEq(1 + 1, 2); });
//   run();

const tests = [];

export function test(name, fn) {
    tests.push({ name, fn });
}

export function assertEq(actual, expected, msg = '') {
    if (actual !== expected) {
        throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

export function assertDeepEq(actual, expected, msg = '') {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
        throw new Error(`${msg}: expected ${e}, got ${a}`);
    }
}

export function assertTrue(cond, msg = '') {
    if (!cond) throw new Error(`${msg}: expected truthy, got ${cond}`);
}

export function assertFalse(cond, msg = '') {
    if (cond) throw new Error(`${msg}: expected falsy, got ${cond}`);
}

export function run() {
    const out = document.getElementById('results');
    let pass = 0, fail = 0;
    for (const t of tests) {
        try {
            t.fn();
            out.innerHTML += `<div style="color:green">✓ ${t.name}</div>`;
            pass++;
        } catch (e) {
            out.innerHTML += `<div style="color:red">✗ ${t.name}<pre>${e.message}</pre></div>`;
            fail++;
        }
    }
    out.innerHTML += `<hr><strong>${pass} passed, ${fail} failed</strong>`;
}
