#!/usr/bin/env python3
"""
Work Time Log Generator

Reads git commit history and tags to produce a client-ready work report.
Outputs:
  - docs/work-time-log.md   (Markdown report with executive summary)
  - docs/work-time-log.csv  (Spreadsheet-friendly data)

Usage:
  python3 docs/generate-work-time-log.py

Configuration (edit below):
  GAP_HOURS     - hours between commits to define a new session (default: 2)
  LEAD_MINUTES  - minutes added before first commit of each session (default: 15)
"""

import os
import re
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

# ── Configuration ──────────────────────────────────────────────────
GAP_HOURS = 2
LEAD_MINUTES = 15
PROJECT_NAME = "Instagram Stories Webhook"
# ───────────────────────────────────────────────────────────────────

GAP = timedelta(hours=GAP_HOURS)
LEAD = timedelta(minutes=LEAD_MINUTES)
DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# Resolve repo root (script lives in docs/)
REPO_ROOT = Path(__file__).resolve().parent.parent
os.chdir(REPO_ROOT)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, check=True).stdout


def parse_commits():
    raw = run(["git", "log", "--all", "--format=%ai|||%h|||%s", "--date=iso"])
    commits = []
    for line in raw.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split("|||")
        ts_str, hash_str, msg = parts[0].strip(), parts[1].strip(), parts[2].strip()
        dt = datetime.strptime(ts_str[:19], "%Y-%m-%d %H:%M:%S")
        tz_str = ts_str[20:].strip()
        sign = 1 if tz_str[0] == "+" else -1
        tz_h, tz_m = int(tz_str[1:3]), int(tz_str[3:5])
        dt_utc = dt - timedelta(hours=tz_h * sign, minutes=tz_m * sign)
        commits.append(
            {"utc": dt_utc, "local": dt, "tz": tz_str, "hash": hash_str, "msg": msg}
        )
    commits.sort(key=lambda x: x["utc"])
    return commits


def parse_versions():
    raw = run(
        [
            "git",
            "tag",
            "-l",
            "--sort=version:refname",
            "--format=%(refname:short)|||%(subject)",
        ]
    )
    versions = []
    for line in raw.strip().split("\n"):
        if not line.strip():
            continue
        p = line.split("|||")
        tag = p[0].strip()
        subj = p[1].strip() if len(p) > 1 else ""
        desc = re.sub(r"^Release v[\d.]+ ?-? ?", "", subj).strip() or tag
        versions.append({"tag": tag, "description": desc})
    return versions


def build_sessions(commits):
    sessions = []
    sess = {
        "commits": [commits[0]],
        "start_utc": commits[0]["utc"],
        "start_local": commits[0]["local"],
    }
    for i in range(1, len(commits)):
        c = commits[i]
        prev = sess["commits"][-1]
        if c["utc"] - prev["utc"] > GAP:
            dur = prev["utc"] - sess["start_utc"] + LEAD
            sessions.append(
                {
                    "start_local": sess["start_local"] - LEAD,
                    "end_local": prev["local"],
                    "duration": dur,
                    "commits": sess["commits"],
                }
            )
            sess = {
                "commits": [c],
                "start_utc": c["utc"],
                "start_local": c["local"],
            }
        else:
            sess["commits"].append(c)
    dur = sess["commits"][-1]["utc"] - sess["start_utc"] + LEAD
    sessions.append(
        {
            "start_local": sess["start_local"] - LEAD,
            "end_local": sess["commits"][-1]["local"],
            "duration": dur,
            "commits": sess["commits"],
        }
    )
    return sessions


def categorize_commits(commits):
    categories = defaultdict(list)
    for c in commits:
        m = c["msg"].lower()
        if m.startswith("feat"):
            categories["Features built"].append(c["msg"])
        elif m.startswith("fix"):
            categories["Bugs fixed & improvements"].append(c["msg"])
        elif m.startswith("test"):
            categories["Quality assurance"].append(c["msg"])
        elif m.startswith("refactor"):
            categories["Code organization"].append(c["msg"])
        elif m.startswith(("docs", "plan", "analysis")):
            categories["Documentation & planning"].append(c["msg"])
        elif m.startswith(("chore", "ci")):
            categories["Infrastructure & maintenance"].append(c["msg"])
        elif m.startswith(("security", "perf")):
            categories["Security & performance"].append(c["msg"])
        else:
            categories["Other work"].append(c["msg"])
    return categories


def fmt(td):
    h = int(td.total_seconds() // 3600)
    m = int((td.total_seconds() % 3600) // 60)
    return f"{h}h {m:02d}m"


def dec(td):
    return f"{td.total_seconds() / 3600:.1f}"


def generate_markdown(sessions, versions, categories, total, total_commits, working_days):
    first_date = sessions[0]["start_local"]
    last_date = sessions[-1]["end_local"]
    calendar_days = (last_date - first_date).days + 1

    daily_hours = defaultdict(timedelta)
    for s in sessions:
        daily_hours[s["start_local"].strftime("%Y-%m-%d")] += s["duration"]
    busiest_day = max(daily_hours, key=lambda k: daily_hours[k])
    busiest_hours = daily_hours[busiest_day]

    md = []

    # ── Header ──
    md.append("# Project Work Report")
    md.append("")
    md.append(f"**Project**: {PROJECT_NAME}")
    md.append(
        f'**Period**: {first_date.strftime("%B %d, %Y")} -- {last_date.strftime("%B %d, %Y")}'
    )
    md.append(f"**Total hours worked**: **{fmt(total)}** ({dec(total)} hours)")
    md.append(
        f'**Report generated**: {datetime.now().strftime("%B %d, %Y at %H:%M")}'
    )
    md.append("")
    md.append("---")
    md.append("")

    # ── Executive Summary ──
    md.append("## Executive Summary")
    md.append("")
    md.append(
        f"Over **{calendar_days} calendar days**, a total of **{fmt(total)} ({dec(total)} hours)** "
        f"of development work was invested into building the {PROJECT_NAME} application. "
        f"Work took place across **{working_days} working days** in **{len(sessions)} focused work sessions**."
    )
    md.append("")
    md.append(
        f"The project progressed from an empty starter template to a fully functional product "
        f"with **{len(versions)} released versions**, encompassing authentication, Instagram integration, "
        f"content management, scheduling, automated publishing, mobile-responsive design, and comprehensive testing."
    )
    md.append("")

    md.append("### Work Breakdown by Area")
    md.append("")
    md.append("| Area of Work | What this means | Changes |")
    md.append("|-------------|-----------------|--------:|")
    cat_desc = {
        "Features built": "New capabilities added to the application",
        "Bugs fixed & improvements": "Issues resolved and existing features improved",
        "Quality assurance": "Automated tests to ensure everything works reliably",
        "Security & performance": "Protection against vulnerabilities and speed improvements",
        "Code organization": "Structural improvements for long-term maintainability",
        "Infrastructure & maintenance": "Build system, deployment pipeline, and tooling",
        "Documentation & planning": "Technical documentation and project planning",
        "Other work": "Miscellaneous development tasks",
    }
    for cat in [
        "Features built",
        "Bugs fixed & improvements",
        "Quality assurance",
        "Security & performance",
        "Code organization",
        "Infrastructure & maintenance",
        "Documentation & planning",
        "Other work",
    ]:
        if cat in categories:
            md.append(
                f"| {cat} | {cat_desc[cat]} | {len(categories[cat])} |"
            )
    md.append("")

    md.append("### Work Pattern")
    md.append("")
    md.append(
        f"- **{working_days} working days** over the {calendar_days}-day project period"
    )
    md.append(f"- Average working day: **{dec(total / working_days)} hours**")
    md.append(f"- Longest working day: **{dec(busiest_hours)} hours** ({busiest_day})")
    md.append(f"- Average session length: **{dec(total / len(sessions))} hours**")
    md.append("")

    # ── Version History ──
    md.append("---")
    md.append("")
    md.append("## Version History")
    md.append("")
    md.append(
        "Each version represents a milestone where new functionality was packaged and released:"
    )
    md.append("")
    md.append("| Version | Milestone |")
    md.append("|---------|-----------|")
    for v in versions:
        md.append(f'| {v["tag"]} | {v["description"]} |')
    md.append("")
    md.append(f"*{len(versions)} versions released to date.*")
    md.append("")

    # ── Detailed Time Log ──
    md.append("---")
    md.append("")
    md.append("## Detailed Time Log")
    md.append("")
    md.append("### Totals")
    md.append("")
    md.append("| Metric | Value |")
    md.append("|--------|-------|")
    md.append(f"| Total work time | **{fmt(total)}** ({dec(total)}h) |")
    md.append(f"| Total sessions | {len(sessions)} |")
    md.append(f"| Total commits | {total_commits} |")
    md.append(f"| Working days | {working_days} |")
    md.append(f"| Calendar days | {calendar_days} |")
    md.append(f"| Average session length | {dec(total / len(sessions))}h |")
    md.append(f"| Average day length | {dec(total / working_days)}h |")
    md.append("")

    # Weekly
    md.append("### Weekly Breakdown")
    md.append("")
    md.append("| Week | Dates | Hours | Sessions | Commits |")
    md.append("|------|-------|------:|---------:|--------:|")
    weekly = defaultdict(
        lambda: {"dur": timedelta(), "sessions": 0, "commits": 0, "ws": None, "we": None}
    )
    for s in sessions:
        dt = s["start_local"]
        ws = dt - timedelta(days=dt.weekday())
        we = ws + timedelta(days=6)
        wk = ws.strftime("%Y-W%W")
        weekly[wk]["dur"] += s["duration"]
        weekly[wk]["sessions"] += 1
        weekly[wk]["commits"] += len(s["commits"])
        weekly[wk]["ws"] = ws
        weekly[wk]["we"] = we
    for wk in sorted(weekly.keys()):
        w = weekly[wk]
        md.append(
            f'| {wk} | {w["ws"].strftime("%b %d")} - {w["we"].strftime("%b %d")} '
            f'| {dec(w["dur"])} | {w["sessions"]} | {w["commits"]} |'
        )
    md.append(
        f"| **Total** | | **{dec(total)}** | **{len(sessions)}** | **{total_commits}** |"
    )
    md.append("")

    # Daily
    md.append("### Daily Breakdown")
    md.append("")
    md.append("| Date | Day | Start | End | Hours | Sessions | Commits |")
    md.append("|------|-----|------:|----:|------:|---------:|--------:|")
    daily = defaultdict(
        lambda: {"dur": timedelta(), "sessions": 0, "commits": 0, "start": None, "end": None}
    )
    for s in sessions:
        dk = s["start_local"].strftime("%Y-%m-%d")
        daily[dk]["dur"] += s["duration"]
        daily[dk]["sessions"] += 1
        daily[dk]["commits"] += len(s["commits"])
        st = s["start_local"].strftime("%H:%M")
        en = s["end_local"].strftime("%H:%M")
        if daily[dk]["start"] is None or st < daily[dk]["start"]:
            daily[dk]["start"] = st
        if daily[dk]["end"] is None or en > daily[dk]["end"]:
            daily[dk]["end"] = en
    for dk in sorted(daily.keys()):
        d = daily[dk]
        dt = datetime.strptime(dk, "%Y-%m-%d")
        dow = DAYS_OF_WEEK[dt.weekday()]
        md.append(
            f'| {dk} | {dow} | {d["start"]} | {d["end"]} '
            f'| {dec(d["dur"])} | {d["sessions"]} | {d["commits"]} |'
        )
    md.append(
        f"| **Total** | | | | **{dec(total)}** | **{len(sessions)}** | **{total_commits}** |"
    )
    md.append("")

    # Session detail
    md.append("### Session Detail")
    md.append("")
    for i, s in enumerate(sessions):
        d = s["duration"]
        date_str = s["start_local"].strftime("%Y-%m-%d")
        start_str = s["start_local"].strftime("%H:%M")
        end_str = s["end_local"].strftime("%H:%M")
        md.append(
            f"#### Session {i + 1} -- {date_str} ({start_str} - {end_str}) -- {fmt(d)}"
        )
        md.append("")
        md.append(f'{len(s["commits"])} commit(s):')
        md.append("")
        md.append("| Time | Hash | Message |")
        md.append("|------|------|---------|")
        for c in s["commits"]:
            t = c["local"].strftime("%H:%M:%S")
            msg = c["msg"].replace("|", "\\|")
            md.append(f'| {t} | `{c["hash"]}` | {msg} |')
        md.append("")

    md.append("---")
    md.append("")
    md.append(
        f"*Methodology: Work sessions are identified by grouping commits with less than "
        f"{GAP_HOURS} hours between them. {LEAD_MINUTES} minutes are added before the first "
        f"commit of each session to account for pre-commit work (reading code, planning, setup). "
        f"Single-commit sessions are counted as {LEAD_MINUTES} minutes.*"
    )

    return "\n".join(md)


def generate_csv(sessions, versions, total, total_commits):
    lines = []
    lines.append("Type,Date,Day,Session,Start,End,Duration_Hours,Commits,Hash,Message")
    for i, s in enumerate(sessions):
        d = s["duration"]
        date_str = s["start_local"].strftime("%Y-%m-%d")
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        dow = DAYS_OF_WEEK[dt.weekday()]
        start_str = s["start_local"].strftime("%H:%M")
        end_str = s["end_local"].strftime("%H:%M")
        dec_val = f"{d.total_seconds() / 3600:.2f}"
        lines.append(
            f'session,{date_str},{dow},{i + 1},{start_str},{end_str},{dec_val},{len(s["commits"])},,""'
        )
        for c in s["commits"]:
            t = c["local"].strftime("%H:%M:%S")
            msg = c["msg"].replace('"', '""')
            lines.append(
                f'commit,{date_str},{dow},{i + 1},{t},,,,{c["hash"]},"{msg}"'
            )
    lines.append(
        f"total,,,{len(sessions)},,,{total.total_seconds() / 3600:.2f},{total_commits},,"
    )
    lines.append("")
    lines.append("Version,Description")
    for v in versions:
        desc = v["description"].replace('"', '""')
        lines.append(f'{v["tag"]},"{desc}"')
    return "\n".join(lines)


def main():
    print("Parsing git history...")
    commits = parse_commits()
    versions = parse_versions()
    sessions = build_sessions(commits)
    categories = categorize_commits(commits)

    total = sum((s["duration"] for s in sessions), timedelta())
    total_commits = sum(len(s["commits"]) for s in sessions)
    working_days = len(
        set(s["start_local"].strftime("%Y-%m-%d") for s in sessions)
    )

    print(f"  {len(commits)} commits, {len(sessions)} sessions, {len(versions)} versions")
    print(f"  Total: {fmt(total)} across {working_days} working days")
    print()

    md_content = generate_markdown(
        sessions, versions, categories, total, total_commits, working_days
    )
    csv_content = generate_csv(sessions, versions, total, total_commits)

    md_path = REPO_ROOT / "docs" / "work-time-log.md"
    csv_path = REPO_ROOT / "docs" / "work-time-log.csv"

    md_path.write_text(md_content)
    csv_path.write_text(csv_content)

    print(f"Written: {md_path}  ({len(md_content.splitlines())} lines)")
    print(f"Written: {csv_path}  ({len(csv_content.splitlines())} rows)")


if __name__ == "__main__":
    main()
