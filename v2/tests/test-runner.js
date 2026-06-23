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

export function run(containerId = 'results') {
    let pass = 0, fail = 0;
    const lines = [];
    for (const t of tests) {
        try {
            t.fn();
            lines.push({ ok: true, name: t.name });
            pass++;
        } catch (e) {
            lines.push({ ok: false, name: t.name, msg: e.message });
            fail++;
        }
    }
    if (typeof document !== 'undefined') {
        const out = document.getElementById(containerId);
        if (!out) throw new Error(`test-runner: no element with id "${containerId}"`);
        for (const l of lines) {
            out.innerHTML += l.ok
                ? `<div style="color:green">✓ ${l.name}</div>`
                : `<div style="color:red">✗ ${l.name}<pre>${l.msg}</pre></div>`;
        }
        out.innerHTML += `<hr><strong>${pass} passed, ${fail} failed</strong>`;
    } else {
        for (const l of lines) {
            console.log(l.ok ? `✓ ${l.name}` : `✗ ${l.name}\n   ${l.msg}`);
        }
        console.log(`\n${pass} passed, ${fail} failed`);
        if (fail > 0) process.exit(1);
    }
}
