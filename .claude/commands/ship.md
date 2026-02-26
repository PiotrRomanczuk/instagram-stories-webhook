---
allowed-tools: Read, Edit, Write, Bash, Glob, Grep, Task
argument-hint: [--patch|--minor|--major] [--skip-linear] [--skip-security] [--dry-run]
description: Full ship workflow — validate branch & changes, run tests, security review, bump version, update Linear, push, and create PR
---

# Ship Workflow

Execute the complete shipping workflow for the current branch: **$ARGUMENTS**

## Workflow Overview

This is the **full end-to-end release workflow**. It validates the branch and its changes, runs unit tests, updates Linear, pushes (lint + tsc run automatically on push via hooks), and creates a PR — all in one command. Version bumping happens automatically after the PR is merged to `main` via a GitHub Action.

**IMPORTANT**: Execute each phase sequentially. **Stop immediately** if any phase fails and report the failure clearly to the user. Do NOT proceed past a failed gate.

---

## Phase 1: Pre-flight Checks

Run ALL of these checks before proceeding:

1. **Get current branch name** via `git branch --show-current`
2. **If on `main` or `production`** — do NOT abort. Instead, **automatically create a new feature branch**:
   - Detect the domain from uncommitted changed files (e.g., `calendar-actions.ts` → `calendar`)
   - Extract or ask for a Linear ticket ID (use `ISW-XXX` as placeholder if unknown)
   - Create branch: `git checkout -b feature/ISW-XXX-{domain}-{short-description}`
   - Continue the workflow on the new branch
3. **Check for uncommitted changes** via `git status --porcelain` — warn the user if there are unstaged or staged changes and ask whether to commit them or abort
4. **Get commits ahead of main** via `git log main..HEAD --oneline` — ABORT if there are zero commits AND no uncommitted changes (nothing to ship)
5. **Extract Linear ticket ID** from branch name (pattern: `ISW-XXX` or `ISW-\d+`) — warn if not found but continue

---

## Phase 2: Validate Branch Matches Changes

Verify that the changed files belong to the domain this branch is about. This prevents accidentally shipping work on the wrong branch (e.g., users table UI changes committed on an `ai-testing` branch).

1. **Get changed files**: `git diff main..HEAD --name-only` (plus uncommitted files from `git diff --name-only` and untracked from `git ls-files --others --exclude-standard`)
2. **Extract the domain keyword(s) from the branch name** — the slug after the ticket ID tells you what domain this branch is for:
   - `feature/ISW-123-ai-generations-history` → domain: **ai**, **generations**
   - `fix/ISW-456-users-table-sorting` → domain: **users**, **table**
   - `refactor/ISW-789-lesson-form-cleanup` → domain: **lesson**, **form**

3. **Map changed files to their domains** using the directory/filename:
   - `components/users/UsersTable.tsx` → domain: **users**
   - `lib/ai/providers/openrouter.ts` → domain: **ai**
   - `app/actions/lessons.ts` → domain: **lessons**
   - `components/songs/SongList.tsx` → domain: **songs**
   - Shared files (`types/`, `schemas/`, `lib/supabase/`, config files) are neutral — they belong to any branch

4. **Check for mismatches**: If a significant portion of changed files belong to a domain that does NOT match the branch name, **ABORT and ask the user**:
   - "You're on branch `feature/ISW-XXX-ai-testing` but 6 of 8 changed files are in `components/users/`. These changes should be on a users-related branch. Continue anyway or abort?"
   - Minor shared/config files (package.json, types/index.ts, CLAUDE.md) should be ignored in this check — they're expected on any branch
   - If ALL changed files are in the branch's domain or are shared files: proceed silently

```
Branch validation:
  Branch:      feature/ISW-123-ai-generations-history
  Domain:      ai, generations
  Changed files by domain:
    ai/         8 files  ✓ matches branch
    types/      2 files  (shared — OK)
    components/ 2 files  ✓ ai-related components
  Assessment:  ✓ All changes belong to this branch
```

**Mismatch example** (would ABORT):
```
Branch validation:
  Branch:      feature/ISW-123-ai-testing
  Domain:      ai, testing
  Changed files by domain:
    users/      6 files  ✗ WRONG BRANCH — users changes don't belong here
    ai/         1 file   ✓ matches branch
    types/      1 file   (shared — OK)
  Assessment:  ✗ Most changes are users-related, not ai-related
               → These should be on a branch like fix/ISW-XXX-users-table-ui
```

---

## Phase 3: Handle Uncommitted Changes

If there are uncommitted changes from Phase 1:

1. Show `git diff --stat` to summarize what changed
2. Ask user: "Stage and commit these changes before shipping?"
   - If yes: stage relevant files (NOT .env or secrets), compose a commit message following the format `type(scope): description [ISW-XXX]`, and commit
   - If no: ABORT with "Please commit or stash your changes first"

---

## Phase 4: Unit Tests Only (MANDATORY)

Run **unit tests only**. **STOP on failure.**

```bash
npm test
```

**IMPORTANT**: This runs **unit tests only** (Vitest). E2E tests (Playwright) are NOT run locally for speed.
- E2E tests run automatically on CI/CD (GitHub Actions) after PR is created
- Local development focuses on fast feedback from unit tests
- E2E tests take 10+ minutes and hit real APIs - reserved for CI only

**On failure**: Report failing tests and STOP. Do not proceed.
**On success**: Report the count.

**Note**: Lint and TypeScript checks are NOT run here — they execute automatically on `git push` via pre-push hooks. If they fail during push (Phase 6), the push will be rejected and you'll need to fix before re-running `/ship`.

```
Quality gates (local):
  Unit Tests: PASSED (XX suites, XX tests)
  Lint:       runs on push (hook)
  TSC:        runs on push (hook)
  E2E Tests:  runs on CI/CD only (GitHub Actions)
```

---

## Phase 5: Security Review (unless `--skip-security`)

Run a targeted security scan on the changed files before shipping. This catches secrets, missing auth, and common vulnerabilities before they reach the remote.

**Spawn the `security-reviewer` agent** with the Task tool to scan the diff:

```
Task(subagent_type="security-reviewer", prompt="Run a targeted security review on the changes being shipped. Focus ONLY on files changed in this branch (get them with `git diff origin/master..HEAD --name-only`). Check for:

1. **Secret leaks**: Scan changed files for hardcoded secrets, tokens, passwords, API keys (Instagram tokens, Supabase keys, FB App Secret, etc.)
2. **NEXT_PUBLIC_ exposure**: Check if any server-side secrets are exposed with NEXT_PUBLIC_ prefix (especially FB_APP_SECRET, SUPABASE_SERVICE_ROLE_KEY, WEBHOOK_SECRET)
3. **Token logging**: Check for console.log/console.error that might log Instagram tokens, Supabase service role keys, or other secrets without masking
4. **New API routes**: If any new API routes were added in app/api/, verify they have auth checks (getServerSession or CRON_SECRET/WEBHOOK_SECRET validation)
5. **Input validation**: New POST/PUT endpoints must validate input with Zod schemas
6. **Webhook security**: If webhook routes were modified, verify WEBHOOK_SECRET is validated strictly (not bypassed if undefined)
7. **RLS bypass risk**: If any Supabase queries were added/modified, check they use supabaseAdmin only in server-side code and not in client components
8. **npm audit**: Run `npm audit --production` and report any critical/high vulnerabilities

Report format:
- PASS: item checked, no issues
- FAIL: item checked, issue found (with file:line reference)
- SKIP: not applicable (e.g., no new API routes)

If ANY item is FAIL, list all failures clearly so the developer can fix them before shipping.")
```

**On FAIL**: Report findings and STOP. The developer must fix security issues before shipping.
**On PASS**: Report summary and continue.

```
Security review:
  Secret leaks:       PASS
  NEXT_PUBLIC_ check: PASS
  Token logging:      PASS
  New API routes:     SKIP (no new routes)
  Input validation:   SKIP (no new endpoints)
  Webhook security:   SKIP (no webhook changes)
  RLS bypass risk:    PASS
  npm audit:          PASS (0 critical, 0 high)
```

If `--skip-security` was passed, skip this phase and note it in the summary.

---

## Phase 6: Version Bump (Manual)

Version bumping is **manual** and must be done before the final commit on the branch. After the PR is merged, `npm run release` creates the git tag and triggers a GitHub Release.

### How it works:
1. Detect the bump type from the branch prefix:
   - `feature/`|`feat/` → **minor** bump
   - `fix/`|`refactor/`|`chore/`|`test/`|`docs/` → **patch** bump
   - Breaking changes → **major** bump (rare, must be explicit)

2. Run the version bump:
   ```bash
   npm version minor --no-git-tag-version  # or patch/major
   ```

3. Stage `package.json` and `package-lock.json`:
   ```bash
   git add package.json package-lock.json
   ```

4. Include the version bump in the commit message:
   ```
   feat: description (0.15.0 -> 0.16.0) (ISW-XXX)
   ```

### What to display:
```
Version bump:
  Current: 0.15.0
  Type:    minor (from feature/ branch prefix)
  New:     0.16.0
  Action:  bumped in package.json, included in commit
```

### After merge:
```bash
git checkout master && git pull
npm run release        # Creates v0.16.0 tag + triggers GitHub Release
```

---

## Phase 7: Push to Remote

1. Check if the branch has an upstream: `git rev-parse --abbrev-ref @{upstream} 2>/dev/null`
2. If no upstream: `git push -u origin {branch-name}`
3. If upstream exists: `git push`

**If push fails due to pre-push hooks (lint/tsc)**: Report the errors clearly and STOP. The user must fix lint/tsc issues and re-run `/ship`.

---

## Phase 8: Update Linear (unless `--skip-linear`)

If a `ISW-XXX` ticket ID was extracted from the branch name:

1. Use Linear MCP `get_issue` to fetch the current issue by the identifier (e.g., `ISW-123`)
2. If found, use `update_issue` to set state to **"In Review"**
3. After the PR is created (Phase 8), add a comment with the PR link using `create_comment`

If `--skip-linear` was passed, skip this phase entirely.
If no ticket ID was found in the branch name, skip and note it in the summary.

---

## Phase 9: Create Pull Request

### Determine PR metadata:

1. **Title**: `[ISW-XXX] Short description from branch name`
   - Convert branch slug to readable text: `add-lesson-reminders` → `Add lesson reminders`
   - Example: `[ISW-123] Add lesson reminders`

2. **Body**: Generate from the commit log since main:
   - Get commits: `git log main..HEAD --pretty=format:"- %s"`
   - Get changed files summary: `git diff main..HEAD --stat`
   - Use the PR template from git-workflow agent

3. **Create the PR**:
```bash
gh pr create --title "{title}" --body "$(cat <<'EOF'
## Linear Ticket
Closes ISW-XXX

## Changes
{bullet list of commits}

## Files Changed
{diff stat summary}

## Quality Gates
- [x] Unit tests passing
- [x] Security review passing
- [x] Version bump: {old} -> {new} ({type} from branch prefix)
- [x] Lint + TSC checked on push (hooks)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

4. Capture the PR URL from the output.

---

## Phase 10: Post-ship (Linear + Summary)

1. If Linear is enabled and a ticket was found:
   - Add a comment on the Linear issue with the PR URL and change summary
   - Attach the PR as a link on the issue

2. Print final summary:
```
Ship complete!
  Branch:   feature/ISW-123-add-lesson-reminders
  Version:  0.15.0 -> 0.16.0 (minor)
  PR:       https://github.com/...
  Linear:   ISW-123 → In Review
  Release:  run `npm run release` after merge to create v0.16.0 tag

  Quality:  tests ✓ | security ✓ | lint ✓ (hook) | tsc ✓ (hook)
```

3. **History Doc Reminder**:
   - Check if `docs/non-technical/FEATURE_IMPLEMENTATION_HISTORY.md` was modified in this branch: `git diff main..HEAD --name-only | grep FEATURE_IMPLEMENTATION_HISTORY`
   - If **modified**: print `✓ History doc updated`
   - If **not modified**: print a reminder:
     ```
     ⚠ Reminder: FEATURE_IMPLEMENTATION_HISTORY.md was not updated in this branch.
       → After merge, update the history doc and run `npm run release` to create the git tag.
       → Run `npm run check-history` to detect any version gaps.
     ```

---

## Dry Run Mode (`--dry-run`)

If `--dry-run` is passed:
- Run Phase 1-5 normally (pre-flight, validation, uncommitted changes, tests, security review)
- For Phase 6-10, only **print what would happen** without executing
- Useful for checking readiness before shipping

---

## Error Recovery

If any phase fails:
- Print exactly which phase failed and why
- Print what was already completed (so the user knows the state)
- Do NOT attempt to rollback completed steps (commits, version bumps) — let the user decide
- Suggest the fix and tell the user they can re-run `/ship` after fixing
