// Pure logic for the phone directory — filtering, formatting, building rows.
// Imported by pages (script type="module") and tests.

function parseISO(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function formatKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function isFullyOnLeave(personCode, leaveEntries, year, month) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const totalDays = monthEnd.getDate();

    const covered = new Set();
    for (const entry of leaveEntries) {
        if (entry.staffCode !== personCode) continue;
        const eStart = typeof entry.startDate === 'string' ? parseISO(entry.startDate) : entry.startDate;
        const eEnd = typeof entry.endDate === 'string' ? parseISO(entry.endDate) : entry.endDate;
        const s = eStart > monthStart ? eStart : monthStart;
        const e = eEnd < monthEnd ? eEnd : monthEnd;
        const cur = new Date(s);
        while (cur <= e) {
            covered.add(formatKey(cur));
            cur.setDate(cur.getDate() + 1);
        }
    }

    return covered.size >= totalDays;
}

export function formatLeaveDates(days) {
    if (!days || days.length === 0) return '';
    const sorted = [...days].sort((a, b) => a - b);
    const groups = [];
    let groupStart = sorted[0], groupEnd = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === groupEnd + 1) {
            groupEnd = sorted[i];
        } else {
            groups.push([groupStart, groupEnd]);
            groupStart = sorted[i];
            groupEnd = sorted[i];
        }
    }
    groups.push([groupStart, groupEnd]);

    return groups.map(([s, e]) => s === e ? `${s}` : `${s}-${e}`).join(', ');
}

function leaveDaysInMonth(personCode, leaveEntries, year, month) {
    const days = new Set();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    for (const entry of leaveEntries) {
        if (entry.staffCode !== personCode) continue;
        const eStart = typeof entry.startDate === 'string' ? parseISO(entry.startDate) : entry.startDate;
        const eEnd = typeof entry.endDate === 'string' ? parseISO(entry.endDate) : entry.endDate;
        const s = eStart > monthStart ? eStart : monthStart;
        const e = eEnd < monthEnd ? eEnd : monthEnd;
        const cur = new Date(s);
        while (cur <= e) {
            days.add(cur.getDate());
            cur.setDate(cur.getDate() + 1);
        }
    }
    return [...days].sort((a, b) => a - b);
}

function rotationOverlapsMonth(trainee, year, month) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const rotStart = parseISO(trainee.rotationStart);
    const rotEnd = parseISO(trainee.rotationEnd);
    return rotStart <= monthEnd && rotEnd >= monthStart;
}

function locumRosteredInMonth(locumCode, oncallRoster, year, month) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    for (const [key, entry] of Object.entries(oncallRoster || {})) {
        if (!key.startsWith(prefix)) continue;
        if (entry.first === locumCode || entry.second === locumCode) return true;
    }
    return false;
}

// On-call locum shifts use the code 'Locum' and carry the locum's name/phone on
// the entry (published per shift, one locum per month). Returns the name/phone to
// show in the directory, or null if no locum is rostered this month.
function findOnCallLocum(oncallRoster, year, month) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    let found = null;
    for (const [key, entry] of Object.entries(oncallRoster || {})) {
        if (!key.startsWith(prefix)) continue;
        if (entry.first === 'Locum' || entry.second === 'Locum') {
            found = { name: entry.locumName || 'Locum', phone: entry.locumPhone || '' };
        }
    }
    return found;
}

function surnameOf(name) {
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1].toLowerCase();
}

export function buildDirectoryForMonth(staff, trainees, locum, leave, oncallRoster, year, month) {
    const rows = [];

    const ssRows = (staff || [])
        .filter(s => !isFullyOnLeave(s.code, leave, year, month))
        .map(s => ({
            code: s.code,
            name: s.name,
            phone: s.phone || '',
            role: 'SS',
            workDays: s.workDays,
            leaveDates: leaveDaysInMonth(s.code, leave, year, month)
        }))
        .sort((a, b) => surnameOf(a.name).localeCompare(surnameOf(b.name)));

    rows.push(...ssRows);

    if (locum && locumRosteredInMonth(locum.code, oncallRoster, year, month)) {
        rows.push({
            code: locum.code,
            name: locum.name,
            phone: locum.phone || '',
            role: 'Locum',
            workDays: null,
            leaveDates: []
        });
    }

    // On-call locum (code 'Locum', name/phone from the roster entry).
    const onCallLocum = findOnCallLocum(oncallRoster, year, month);
    if (onCallLocum) {
        rows.push({
            code: 'Locum',
            name: onCallLocum.name,
            phone: onCallLocum.phone,
            role: 'Locum',
            workDays: null,
            leaveDates: []
        });
    }

    const traineeRows = (trainees || [])
        .filter(t => rotationOverlapsMonth(t, year, month))
        .filter(t => !isFullyOnLeave(t.code, leave, year, month))
        .map(t => ({
            code: t.code,
            name: t.name,
            phone: t.phone || '',
            role: 'Trainee',
            workDays: null,
            leaveDates: leaveDaysInMonth(t.code, leave, year, month)
        }))
        .sort((a, b) => surnameOf(a.name).localeCompare(surnameOf(b.name)));

    rows.push(...traineeRows);

    return rows;
}
