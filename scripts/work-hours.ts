#!/usr/bin/env npx tsx
/**
 * Work Hours Calculator
 *
 * Estimates work hours from git commit timestamps.
 * - Groups commits into sessions (gap > 2h = new session)
 * - Adds 15 minutes to the first commit of each session
 *   (accounts for thinking/setup time before the first commit)
 * - Adds 15 hours to the first session (MVP pre-development:
 *   planning, learning Meta API docs, Supabase setup, etc.)
 *
 * Usage:
 *   npx tsx scripts/work-hours.ts
 *   npx tsx scripts/work-hours.ts --author piotr
 *   npx tsx scripts/work-hours.ts --since 2026-02-01
 *   npx tsx scripts/work-hours.ts --gap 3
 */

import { execSync } from "child_process";

const SESSION_GAP_HOURS = 2;
const SESSION_PADDING_MINUTES = 15;
const MVP_PRE_COMMIT_MINUTES = 900; // 15 hours for pre-development (planning, learning, setup)

interface Commit {
  hash: string;
  author: string;
  date: Date;
  message: string;
}

interface Session {
  commits: Commit[];
  start: Date;
  end: Date;
  rawMinutes: number;
  totalMinutes: number;
}

function parseArgs(): {
  author?: string;
  since?: string;
  until?: string;
  gap: number;
  verbose: boolean;
} {
  const args = process.argv.slice(2);
  const opts: ReturnType<typeof parseArgs> = { gap: SESSION_GAP_HOURS, verbose: false };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--author":
      case "-a":
        opts.author = args[++i];
        break;
      case "--since":
      case "-s":
        opts.since = args[++i];
        break;
      case "--until":
      case "-u":
        opts.until = args[++i];
        break;
      case "--gap":
      case "-g":
        opts.gap = parseFloat(args[++i]);
        break;
      case "--verbose":
      case "-v":
        opts.verbose = true;
        break;
    }
  }

  return opts;
}

function getCommits(author?: string, since?: string, until?: string): Commit[] {
  const parts = ["git", "log", "--all", '--format="%H|%an|%ai|%s"'];
  if (author) parts.push(`--author=${author}`);
  if (since) parts.push(`--since=${since}`);
  if (until) parts.push(`--until=${until}`);

  const output = execSync(parts.join(" "), { encoding: "utf-8" }).trim();
  if (!output) return [];

  const seen = new Set<string>();

  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, authorName, dateStr, ...msgParts] = line.split("|");
      return { hash, author: authorName, date: new Date(dateStr), message: msgParts.join("|") };
    })
    .filter((c) => {
      if (seen.has(c.hash)) return false;
      seen.add(c.hash);
      return true;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function groupIntoSessions(commits: Commit[], gapHours: number): Session[] {
  if (commits.length === 0) return [];

  const gapMs = gapHours * 60 * 60 * 1000;
  const sessions: Session[] = [];
  let current: Commit[] = [commits[0]];

  for (let i = 1; i < commits.length; i++) {
    const gap = commits[i].date.getTime() - commits[i - 1].date.getTime();
    if (gap > gapMs) {
      sessions.push(buildSession(current));
      current = [commits[i]];
    } else {
      current.push(commits[i]);
    }
  }
  sessions.push(buildSession(current));

  return sessions;
}

function buildSession(commits: Commit[]): Session {
  const start = commits[0].date;
  const end = commits[commits.length - 1].date;
  const rawMinutes = (end.getTime() - start.getTime()) / 1000 / 60;
  const totalMinutes = rawMinutes + SESSION_PADDING_MINUTES;

  return { commits, start, end, rawMinutes, totalMinutes };
}

function fmt(date: Date): string {
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function fmtTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function printReport(sessions: Session[], commits: Commit[], verbose: boolean) {
  // Add MVP pre-development time to the first session
  if (sessions.length > 0) {
    sessions[0].totalMinutes += MVP_PRE_COMMIT_MINUTES;
  }

  const totalMinutes = sessions.reduce((sum, s) => sum + s.totalMinutes, 0);
  const totalHours = totalMinutes / 60;

  const activeDays = new Set(sessions.map((s) => s.start.toISOString().slice(0, 10)));
  const longestSession = sessions.reduce(
    (max, s) => (s.totalMinutes > max ? s.totalMinutes : max),
    0
  );

  console.log("");
  console.log("=".repeat(60));
  console.log("  WORK HOURS REPORT");
  console.log("=".repeat(60));
  console.log(`  Commits:          ${commits.length}`);
  console.log(`  Sessions:         ${sessions.length}`);
  console.log(`  Active days:      ${activeDays.size}`);
  console.log(`  Longest session:  ${fmtDuration(longestSession)}`);
  console.log(`  Session padding:  +${SESSION_PADDING_MINUTES}m per session`);
  console.log(`  MVP pre-dev:      +${fmtDuration(MVP_PRE_COMMIT_MINUTES)} (added to first session)`);
  console.log("-".repeat(60));
  console.log(`  TOTAL:            ${totalHours.toFixed(1)}h (${fmtDuration(totalMinutes)})`);
  console.log("=".repeat(60));

  // Daily breakdown
  const dailyMap = new Map<string, number>();
  for (const s of sessions) {
    const day = s.start.toISOString().slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + s.totalMinutes);
  }

  console.log("\n  Daily breakdown:");
  console.log("-".repeat(60));
  for (const [day, mins] of [...dailyMap.entries()].sort()) {
    const bar = "#".repeat(Math.round(mins / 15));
    console.log(`  ${day}  ${fmtDuration(mins).padStart(8)}  ${bar}`);
  }

  // Session details
  if (verbose) {
    console.log("\n  Session details:");
    console.log("-".repeat(60));
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      const mvpNote = i === 0 ? ` (incl. ${fmtDuration(MVP_PRE_COMMIT_MINUTES)} MVP pre-dev)` : "";
      console.log(
        `  #${String(i + 1).padStart(3)}  ${fmt(s.start)} - ${fmtTime(s.end)}  ` +
          `${String(s.commits.length).padStart(3)} commits  ` +
          `${fmtDuration(s.rawMinutes).padStart(8)} + ${SESSION_PADDING_MINUTES}m = ${fmtDuration(s.totalMinutes).padStart(8)}${mvpNote}`
      );
    }
  } else {
    console.log(`\n  Use --verbose for full session details.`);
  }

  console.log("");
}

function main() {
  const opts = parseArgs();
  const commits = getCommits(opts.author, opts.since, opts.until);

  if (commits.length === 0) {
    console.log("No commits found.");
    process.exit(0);
  }

  const sessions = groupIntoSessions(commits, opts.gap);
  printReport(sessions, commits, opts.verbose);
}

main();
