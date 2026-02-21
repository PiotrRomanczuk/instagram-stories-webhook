#!/usr/bin/env tsx
/**
 * check-history-gaps.ts
 *
 * Compares git tags vs FEATURE_IMPLEMENTATION_HISTORY.md entries
 * to detect missing documentation or missing tags.
 *
 * Usage:
 *   npx tsx scripts/check-history-gaps.ts         # report gaps
 *   npx tsx scripts/check-history-gaps.ts --fix    # generate skeleton entries for missing docs
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

const HISTORY_PATH = join(
  process.cwd(),
  "docs/non-technical/FEATURE_IMPLEMENTATION_HISTORY.md"
);

const FIX_MODE = process.argv.includes("--fix");

function getGitTags(): string[] {
  const output = execSync("git tag --sort=v:refname", { encoding: "utf-8" });
  return output
    .trim()
    .split("\n")
    .filter((t) => /^v\d+\.\d+\.\d+$/.test(t));
}

function getDocVersions(): string[] {
  const content = readFileSync(HISTORY_PATH, "utf-8");
  const matches = content.matchAll(/^### (v\d+\.\d+\.\d+)/gm);
  return [...matches].map((m) => m[1]);
}

function getPackageVersion(): string {
  const pkg = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf-8")
  );
  return `v${pkg.version}`;
}

function getCommitsBetween(from: string, to: string): string[] {
  try {
    const output = execSync(
      `git log ${from}..${to} --pretty=format:"%s" --reverse`,
      { encoding: "utf-8" }
    );
    return output
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getTagDate(tag: string): string {
  try {
    const output = execSync(
      `git log -1 --format=%ci ${tag}`,
      { encoding: "utf-8" }
    );
    const date = new Date(output.trim());
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Unknown date";
  }
}

function main() {
  const tags = getGitTags();
  const docVersions = new Set(getDocVersions());
  const tagSet = new Set(tags);
  const pkgVersion = getPackageVersion();

  let hasGaps = false;

  // Tags with no doc entry
  const missingDocs = tags.filter((t) => !docVersions.has(t));
  if (missingDocs.length > 0) {
    hasGaps = true;
    console.log("Tags with no history doc entry:");
    for (const tag of missingDocs) {
      console.log(`  - ${tag}`);
    }
    console.log();
  }

  // Doc entries with no tag
  const missingTags = [...docVersions].filter((v) => !tagSet.has(v));
  if (missingTags.length > 0) {
    hasGaps = true;
    console.log("History doc entries with no git tag:");
    for (const v of missingTags) {
      console.log(`  - ${v}`);
    }
    console.log();
  }

  // Untagged package.json version
  if (!tagSet.has(pkgVersion)) {
    console.log(
      `Untagged package.json version: ${pkgVersion} (no git tag exists yet)`
    );
    console.log();
  }

  if (!hasGaps) {
    console.log("No gaps found. All git tags have history doc entries and vice versa.");
  }

  // --fix mode: generate skeleton entries for missing docs
  if (FIX_MODE && missingDocs.length > 0) {
    console.log("---");
    console.log("Skeleton entries for missing documentation:");
    console.log("(Copy these into FEATURE_IMPLEMENTATION_HISTORY.md)");
    console.log();

    for (const tag of missingDocs) {
      const date = getTagDate(tag);
      const tagIndex = tags.indexOf(tag);
      const prevTag = tagIndex > 0 ? tags[tagIndex - 1] : null;
      const commits = prevTag ? getCommitsBetween(prevTag, tag) : [];

      console.log(`### ${tag} — TODO: Title (${date})`);
      console.log(`*${commits.length} commits*`);
      console.log();
      if (commits.length > 0) {
        for (const commit of commits.slice(0, 10)) {
          console.log(`- ${commit}`);
        }
        if (commits.length > 10) {
          console.log(`- ... and ${commits.length - 10} more commits`);
        }
      } else {
        console.log("- TODO: Describe what changed in this version");
      }
      console.log();
      console.log("---");
      console.log();
    }
  }
}

main();
