#!/usr/bin/env python3
"""
Regenerate /leave.ics from /v2/data.json.

Run from repo root:  python3 scripts/regenerate_ics.py

The output (leave.ics) is the iCalendar feed subscribers are pointed at via
the "Subscribe to Calendar" button in leave.html. Calendar apps refresh it
roughly every 6 hours per the X-PUBLISHED-TTL header.

This script is invoked manually for the initial clean baseline AND
automatically by .github/workflows/regenerate-ics.yml whenever
v2/data.json changes on main.

Output is deterministic given the same input: entries are sorted by
(staffCode, startDate, leaveType) so unchanged data produces a no-op
diff and the GitHub Action skips committing.
"""
from __future__ import annotations
import json
from datetime import date, datetime, timedelta
from pathlib import Path

# Map internal staff codes to the friendly first-name used in ICS SUMMARY.
# Matches the convention from the original (manually-generated) leave.ics.
SHORT_NAMES = {
    "BT": "Ben",
    "AL": "Angela",
    "GB": "Greg",
    "HY": "Helen",
    "MK": "Muoi",
    "RW": "Ron",
    "SR": "Steph",
    "Fadz": "Fadz",
}

# Map full leave type strings to short labels for the SUMMARY line and UID.
TYPE_SHORT = {
    "Annual Leave": "AL",
    "Long Service Leave": "LSL",
    "TESL": "TESL",
    "Unavailable": "Unavailable",
}

# Map full leave type strings to UID slug fragments.
TYPE_UID = {
    "Annual Leave": "al",
    "Long Service Leave": "lsl",
    "TESL": "tesl",
    "Unavailable": "unavail",
}


def parse_iso_date(s: str) -> date:
    """Parse YYYY-MM-DD as a date (no timezone)."""
    return datetime.strptime(s, "%Y-%m-%d").date()


def fold_line(line: str, limit: int = 75) -> str:
    """RFC 5545 line-folding: long lines split with a CRLF + space.

    We don't expect to hit this often (SUMMARY/DESCRIPTION are short),
    but keeping it correct guards against subtle parser issues in
    Outlook/iOS Calendar.
    """
    if len(line) <= limit:
        return line
    parts = [line[:limit]]
    rest = line[limit:]
    while rest:
        parts.append(" " + rest[: limit - 1])
        rest = rest[limit - 1 :]
    return "\r\n".join(parts)


def escape_text(s: str) -> str:
    """Escape commas, semicolons and newlines per RFC 5545."""
    return (
        s.replace("\\", "\\\\")
        .replace(",", "\\,")
        .replace(";", "\\;")
        .replace("\n", "\\n")
    )


def build_event(entry: dict) -> list[str]:
    code = entry["staffCode"]
    short_name = SHORT_NAMES.get(code, code)
    leave_type = entry["leaveType"]
    type_short = TYPE_SHORT.get(leave_type, leave_type)
    type_uid = TYPE_UID.get(leave_type, leave_type.lower().replace(" ", "-"))

    start = parse_iso_date(entry["startDate"])
    end_inclusive = parse_iso_date(entry["endDate"])
    # ICS DTEND for VALUE=DATE is exclusive — the day AFTER the last day on leave.
    end_exclusive = end_inclusive + timedelta(days=1)

    uid = f"{code.lower()}-{type_uid}-{start:%Y%m%d}@islhd-palliative"
    summary = f"{short_name} - {type_short}"

    lines = [
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTART;VALUE=DATE:{start:%Y%m%d}",
        f"DTEND;VALUE=DATE:{end_exclusive:%Y%m%d}",
        fold_line(f"SUMMARY:{escape_text(summary)}"),
    ]

    notes = entry.get("notes")
    if notes and notes.strip():
        lines.append(fold_line(f"DESCRIPTION:{escape_text(notes.strip())}"))

    lines.append("TRANSP:TRANSPARENT")
    lines.append("END:VEVENT")
    return lines


def regenerate(data_path: Path, ics_path: Path) -> str:
    data = json.loads(data_path.read_text())
    leave = data.get("leave", [])

    # Sort for deterministic output: by staff, then start date, then type.
    leave_sorted = sorted(
        leave,
        key=lambda e: (e["staffCode"], e["startDate"], e["endDate"], e["leaveType"]),
    )

    # Build calendar
    out = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//ISLHD Palliative Care//Leave Calendar//EN",
        "X-WR-CALNAME:Palliative Care Leave",
        "X-WR-CALDESC:Staff specialist leave for ISLHD Palliative Care",
        "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
        "X-PUBLISHED-TTL:PT6H",
        "METHOD:PUBLISH",
    ]
    for entry in leave_sorted:
        out.extend(build_event(entry))
    out.append("END:VCALENDAR")

    # RFC 5545 wants CRLF line endings. Write with explicit \r\n.
    body = "\r\n".join(out) + "\r\n"
    ics_path.write_text(body, newline="")
    return body


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent
    data_path = repo_root / "v2" / "data.json"
    ics_path = repo_root / "leave.ics"

    if not data_path.exists():
        raise SystemExit(f"v2/data.json not found at {data_path}")

    body = regenerate(data_path, ics_path)
    n_events = body.count("BEGIN:VEVENT")
    print(f"✓ Regenerated {ics_path.name} with {n_events} event(s)")
    print(f"  Source: {data_path.relative_to(repo_root)}")
    print(f"  Output: {ics_path.relative_to(repo_root)}")
