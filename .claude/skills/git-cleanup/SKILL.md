---
name: git-cleanup
description: Comprehensive git tree cleanup - delete merged/closed branches, handle uncommitted changes, and create PRs for active work. Use when the git tree has accumulated old branches or needs organization.
---

# Git Tree Cleanup

## Overview

Automatically cleans up your git repository by:
1. Identifying and deleting local branches with closed/merged PRs
2. Removing merged remote branches from origin
3. Handling uncommitted changes (commit or create PRs)
4. Ensuring all active work has open PRs
5. Providing a comprehensive cleanup summary

## When to Use

- After merging multiple PRs and branches are piling up
- Before starting new work to get a clean view
- During sprint cleanup to remove old feature branches
- When `git branch` shows too many stale branches

## Execution Steps

### Phase 1: Analysis

1. **Fetch and analyze branches**
   ```bash
   git fetch --all
   git fetch --prune  # Remove stale remote-tracking branches
   ```

2. **Get all PRs with status**
   ```bash
   gh pr list --state all --limit 100 --json number,title,headRefName,state
   ```

3. **Categorize branches**
   - Local branches with OPEN PRs → Keep
   - Local branches with MERGED PRs → Delete
   - Local branches with CLOSED PRs → Delete
   - Local branches with no PR → Check for commits
   - Remote branches with merged PRs → Delete from origin

### Phase 2: Local Branch Cleanup

1. **Identify branches to delete**
   - Match local branches against PR list
   - Find branches where PR state is MERGED or CLOSED
   - Exclude: main, production, current branch

2. **Delete local branches**
   ```bash
   git branch -D <branch-name>
   ```

3. **Handle branches with uncommitted changes**
   - If current branch: Ask user to commit or stash
   - If other branch: Switch to it, show status, ask for action

### Phase 3: Remote Branch Cleanup

1. **Identify merged remote branches**
   - Cross-reference remote branches with PR list
   - Find branches where PR state is MERGED
   - Never delete: main, production, HEAD

2. **Delete from origin** (requires confirmation)
   ```bash
   git push origin --delete <branch-name>
   ```

3. **Run final prune**
   ```bash
   git fetch --prune
   ```

### Phase 4: Create Missing PRs

1. **Find branches without PRs**
   - Local branches with commits ahead of main
   - Pushed to remote but no open PR

2. **For each branch, analyze commits**
   ```bash
   git log main..branch-name --oneline
   git diff main...branch-name
   ```

3. **Create PR using project conventions**
   - Extract ticket number from branch name
   - Generate title from commits
   - Create body with summary and test plan
   - Link to Linear ticket

### Phase 5: Summary Report

Provide a clear summary:
- ✅ Kept branches (with PR numbers)
- 🗑️ Deleted local branches (with reason)
- 🗑️ Deleted remote branches (with PR numbers)
- 📝 Created new PRs (with PR numbers)
- ⚠️ Branches needing attention (uncommitted changes, conflicts)

## Branch Categories

### Keep
- Branches with OPEN PRs
- main, production, develop (base branches)
- Current working branch (until user is done)

### Delete Local
- PR state: MERGED or CLOSED
- No commits ahead of main (empty branches)
- Duplicate branches (same commits as another branch)

### Delete Remote
- PR state: MERGED (already integrated)
- Explicitly closed and no longer needed

### Requires Action
- Uncommitted changes → commit or stash
- No PR but has commits → create PR
- Conflicts with main → needs rebase

## Safety Checks

1. **Never delete without confirmation** for:
   - Remote branches (affects team)
   - Branches with uncommitted changes
   - Current working branch

2. **Always verify** before deleting:
   - Branch is fully merged to main
   - PR is actually closed/merged (not just stale)
   - No unique commits would be lost

3. **Preserve work**:
   - Warn about uncommitted changes
   - Show commit summary before deleting
   - Offer to create PR instead of deleting

## PR Creation Workflow

When creating PRs for branches without them:

1. **Extract metadata from branch**
   ```
   feature/STRUM-123-add-feature → [STRUM-123] Add feature
   fix/STRUM-456-bug-fix → [STRUM-456] Bug fix
   ```

2. **Generate PR body**
   ```markdown
   ## Summary
   - <Bullet points from commit messages>

   ## Changes
   <Summary of git diff --stat>

   ## Test Plan
   - [ ] Lint passes: npm run lint
   - [ ] Tests pass: npm test
   - [ ] E2E tests pass (if applicable)

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   ```

3. **Create and link**
   ```bash
   gh pr create --title "[STRUM-123] Title" --body "<body>"
   ```

## Example Output

```
🧹 Git Tree Cleanup Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ANALYSIS
  Local branches: 12
  Remote branches: 18
  Open PRs: 3
  Merged PRs: 15

✅ KEPT (3 branches)
  • feature/STRUM-XXX-student-activity-tracking → PR #129 (OPEN)
  • feature/STRUMMY-260-user-repository-layer → PR #128 (OPEN)
  • dependabot/github_actions/actions/checkout-6 → PR #123 (OPEN)

🗑️  DELETED LOCAL (4 branches)
  • dependabot/npm_and_yarn/dependencies-f80e182b08 → PR #124 (CLOSED)
  • fix/STRUM-XXX-songs-list-serialization → PR #113 (CLOSED)
  • feature/STRUMMY-XXX-nivo-statistics-dashboard → duplicate of PR #128
  • feature/STRUMMY-XXX-song-stats-nivo → empty, no commits

🗑️  DELETED REMOTE (12 branches)
  • feature/STRUM-96-email-notification-templates → PR #86 (MERGED)
  • feature/STRUM-97-self-service-profile → PR #85 (MERGED)
  • fix/BMS-211-217-security-fixes → PR #105 (MERGED)
  ... (9 more)

📝 CREATED PRs (0)
  None needed - all active branches have PRs

⚠️  NEEDS ATTENTION (0)
  None

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Cleanup complete! Your git tree is now organized.
```

## Project-Specific Notes

### Guitar CRM / Strummy

- **Base branches**: main, production
- **Ticket format**: STRUM-XXX or STRUMMY-XXX
- **PR title format**: `[STRUM-XXX] Description`
- **Commit format**: `type(scope): description [STRUM-XXX]`

### Git Workflow Integration

This skill follows the project's git workflow:
- See `.claude/agents/git-workflow.md` for branch naming conventions
- See `.claude/agents/pr-manager.md` for PR creation standards
- Respects version bumping rules (automatic post-merge)

## Error Handling

### Uncommitted Changes
```
⚠️  Branch 'feature/xyz' has uncommitted changes:
  M  components/users/UsersList.tsx
  M  app/api/users/route.ts

Choose action:
  1. Commit changes and create PR
  2. Stash changes and delete branch
  3. Skip this branch
```

### Failed Remote Delete
```
❌ Failed to delete 'origin/feature/xyz':
   Error: remote ref does not exist

   → Already deleted on GitHub (auto-pruning local reference)
```

### PR Creation Failure
```
❌ Failed to create PR for 'feature/abc':
   Error: No commits between main and feature/abc

   → Branch is up-to-date with main, consider deleting
```

## Automation Options

### Interactive Mode (Default)
- Asks for confirmation before deletions
- Shows detailed analysis for each decision
- Allows selective cleanup

### Auto Mode (--auto flag concept)
- Deletes all merged/closed branches automatically
- Creates PRs for branches with commits
- Only prompts for uncommitted changes

## References

- Git workflow: `.claude/agents/git-workflow.md`
- PR creation: `.claude/agents/pr-manager.md`
- Linear integration: `.claude/agents/linear-coordinator.md`
