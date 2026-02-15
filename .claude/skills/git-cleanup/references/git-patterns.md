# Git Cleanup Patterns

## Common Scenarios

### Scenario 1: Post-Sprint Cleanup

**Situation**: Multiple PRs merged, branches accumulating

**Actions**:
1. Delete all local branches with merged PRs
2. Delete merged remote branches
3. Keep dependabot branches with open PRs
4. Create PRs for any feature work without them

**Commands**:
```bash
# Get all merged branches
git branch --merged main | grep -v "main\|production"

# Delete local merged branches
git branch -d branch-name  # Safe delete (only if merged)
git branch -D branch-name  # Force delete

# Delete remote merged branches
git push origin --delete branch-name
```

### Scenario 2: Stale Feature Branches

**Situation**: Old feature branches from abandoned work

**Identification**:
- No commits in 30+ days
- PR is closed (not merged)
- No recent activity on related Linear ticket

**Actions**:
1. Verify work is truly abandoned
2. Check if any unique commits exist
3. Delete if safe, otherwise archive

### Scenario 3: Duplicate Branches

**Situation**: Multiple branches with same commits

**Identification**:
```bash
# Compare commits
git log --oneline branch1..branch2
git log --oneline branch2..branch1

# If both return empty, branches are identical
```

**Actions**:
- Keep the branch with the PR
- Delete duplicate local branches
- Update local references if needed

### Scenario 4: Uncommitted Changes on Old Branch

**Situation**: Branch has uncommitted work, PR is merged/closed

**Options**:
1. **Commit and create new PR** (if work is valuable)
2. **Stash for later** (if work is in progress)
3. **Discard changes** (if work is obsolete)

**Commands**:
```bash
# Option 1: Commit
git add .
git commit -m "type(scope): description [TICKET]"
git push -u origin branch-name

# Option 2: Stash
git stash save "WIP: description"
git checkout main
git branch -D old-branch

# Option 3: Discard
git checkout main
git branch -D old-branch  # Will fail with warning
git branch -D old-branch  # Force if confirmed
```

### Scenario 5: Remote Already Deleted

**Situation**: Remote branch deleted on GitHub, still shows locally

**Symptoms**:
```bash
git push origin --delete branch-name
# Error: remote ref does not exist
```

**Solution**:
```bash
# Prune stale remote references
git fetch --prune

# Verify cleanup
git branch -r  # Should not show deleted branch
```

## Branch Categorization Logic

### Auto-Delete (Safe)

✅ **Conditions**:
- PR state is MERGED
- Branch is fully merged to main
- No uncommitted changes
- Not a base branch (main, production)

```bash
# Verify safe to delete
git branch --merged main | grep branch-name
git log main..branch-name  # Should be empty
```

### Manual Review Required

⚠️ **Conditions**:
- PR state is CLOSED (not merged)
- Has commits not in main
- Has uncommitted changes
- Created within last 7 days

**Actions**:
- Check Linear ticket status
- Review commits for unique work
- Consult team if uncertain

### Keep

🔒 **Conditions**:
- PR state is OPEN
- Currently checked out
- Base branches (main, production, develop)
- Has active Linear ticket

## PR Creation Patterns

### From Branch Name

Extract ticket and generate title:

```
feature/STRUM-123-add-user-export
→ [STRUM-123] Add user export

fix/STRUM-456-broken-calendar
→ [STRUM-456] Broken calendar

refactor/STRUM-789-split-components
→ [STRUM-789] Split components
```

### From Commit History

Generate summary from commits:

```bash
# Get commits
git log main..HEAD --oneline

# Example commits:
# abc123 feat(users): add export functionality
# def456 test(users): add export tests
# ghi789 docs(users): update export docs

# Generated PR body:
## Summary
- Add user export functionality
- Add comprehensive tests
- Update documentation
```

### PR Body Template

```markdown
## Summary
- <Key changes from commits>

## Changes
**Modified Files**: <count>
**Lines Added**: <+count>
**Lines Removed**: <-count>

<Brief description of architectural changes>

## Test Plan
- [ ] Lint passes: npm run lint
- [ ] Unit tests pass: npm test
- [ ] Integration tests pass: npm run test:integration
- [ ] E2E tests pass (if UI changes): npx playwright test
- [ ] Manual testing completed

## Linear Ticket
Fixes STRUM-XXX

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Safety Checks

### Pre-Delete Checklist

- [ ] Verify PR is actually merged/closed
- [ ] Check for unique commits: `git log main..branch`
- [ ] Verify no uncommitted changes: `git status`
- [ ] Confirm not on the branch: `git branch --show-current`
- [ ] Check Linear ticket is closed (if applicable)

### Remote Delete Checklist

- [ ] Team notification (if long-lived branch)
- [ ] Verify branch is merged to main
- [ ] Check no one else is working on it
- [ ] Confirm CI/CD not dependent on it

### Rollback Plan

If branch deleted by mistake:

```bash
# Find the commit hash
git reflog | grep branch-name

# Recreate branch
git branch branch-name <commit-hash>

# Or restore from remote (if not deleted there)
git checkout -b branch-name origin/branch-name
```

## Batch Operations

### Delete All Merged Local Branches

```bash
# Safe delete (only if merged)
git branch --merged main |
  grep -v "main\|production\|*" |
  xargs -n 1 git branch -d
```

### Delete All Closed PR Branches

```bash
# Get closed PR branches
CLOSED_BRANCHES=$(gh pr list --state closed --json headRefName --jq '.[].headRefName')

# Delete each one
for branch in $CLOSED_BRANCHES; do
  git branch -D "$branch" 2>/dev/null || echo "Branch $branch not found locally"
done
```

### Delete All Merged Remote Branches

```bash
# Get merged PR branches
MERGED_BRANCHES=$(gh pr list --state merged --json headRefName --jq '.[].headRefName')

# Delete from origin
for branch in $MERGED_BRANCHES; do
  git push origin --delete "$branch" 2>/dev/null || echo "Branch $branch already deleted"
done

# Cleanup local references
git fetch --prune
```

## Edge Cases

### Dependabot Branches

**Pattern**: `dependabot/<ecosystem>/<package>-<version>`

**Handling**:
- Keep if PR is OPEN
- Delete if PR is MERGED or CLOSED
- Always safe to delete (automated recreation)

### Branches Without PRs

**Criteria for Keeping**:
- Has commits not in main
- Created within last 7 days
- Matches an active Linear ticket

**Criteria for Deleting**:
- No commits ahead of main
- Older than 30 days
- No associated Linear ticket

### Branches with Merge Conflicts

**Detection**:
```bash
git merge-base --is-ancestor main branch-name
# Exit code 1 = needs rebase
```

**Handling**:
- Mark as "needs attention"
- Don't auto-delete
- Suggest rebase: `git rebase main`

## Metrics to Track

After cleanup, report:

- **Deleted**: Local branches, remote branches
- **Created**: New PRs
- **Kept**: Active branches with PRs
- **Attention**: Branches needing manual review

Example:
```
📊 Cleanup Metrics
━━━━━━━━━━━━━━━━━━━━━━━━
Before: 25 local, 35 remote
After:  4 local, 6 remote

Deleted: 21 local, 29 remote
Created: 0 PRs
Kept: 3 branches (all with open PRs)
Attention: 0 branches
```

## Best Practices

1. **Run cleanup weekly** - Prevents accumulation
2. **Always fetch first** - Ensure latest PR states
3. **Use --prune regularly** - Clean stale remote refs
4. **Verify before delete** - Check for unique commits
5. **Document decisions** - Note why branches kept/deleted
6. **Batch similar operations** - Efficient cleanup
7. **Keep base branches** - Never delete main/production
8. **Check CI/CD** - Ensure no dependencies on old branches
