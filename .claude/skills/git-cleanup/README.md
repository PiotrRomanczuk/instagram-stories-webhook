# Git Cleanup Skill

Comprehensive git tree cleanup tool for managing branches, PRs, and keeping your repository organized.

## Quick Start

```bash
# Use the skill
/git-cleanup

# Or use the analysis script directly
./.claude/skills/git-cleanup/scripts/analyze-branches.sh
```

## What It Does

1. **Analyzes** all local and remote branches
2. **Categorizes** branches by PR status (open, merged, closed, none)
3. **Deletes** local branches with merged/closed PRs
4. **Removes** merged remote branches from origin
5. **Creates PRs** for branches with commits but no PR
6. **Handles** uncommitted changes gracefully
7. **Reports** comprehensive cleanup summary

## When to Use

- ✅ After merging multiple PRs
- ✅ Before starting new work
- ✅ During sprint cleanup
- ✅ When `git branch` shows too many branches
- ✅ Weekly maintenance routine

## File Structure

```
git-cleanup/
├── SKILL.md                    # Main skill instructions
├── README.md                   # This file
├── scripts/
│   └── analyze-branches.sh     # Branch analysis helper
└── references/
    └── git-patterns.md         # Detailed patterns and edge cases
```

## Example Usage

### Interactive Mode (Default)

```
User: /git-cleanup

Claude: 🔍 Analyzing git tree...

📊 Found:
  - 12 local branches
  - 18 remote branches
  - 3 open PRs
  - 15 merged PRs

🗑️  Can delete:
  - 4 local branches (merged)
  - 12 remote branches (merged)

Proceed with cleanup? (y/n)
```

### Analysis Only

```
User: Just analyze my branches, don't delete anything

Claude: 🔍 Running analysis...
[Shows categorized branch list]
```

### Auto Mode

```
User: /git-cleanup auto

Claude: Running automatic cleanup...
✅ Deleted 4 local branches
✅ Deleted 12 remote branches
✅ Created 0 PRs
```

## Safety Features

- ✅ Never deletes branches with open PRs
- ✅ Never deletes base branches (main, production)
- ✅ Warns about uncommitted changes
- ✅ Shows commit summary before deletion
- ✅ Asks for confirmation on remote deletes
- ✅ Preserves current working branch

## Branch Categories

### ✅ Keep

- Branches with OPEN PRs
- Base branches (main, production)
- Current working branch
- Recently created (< 7 days) with commits

### 🗑️ Auto-Delete

- Local branches with MERGED PRs
- Local branches with CLOSED PRs (after review)
- Empty branches (no commits ahead of main)
- Duplicate branches

### ⚠️ Manual Review

- Branches with uncommitted changes
- Branches with conflicts
- CLOSED PRs (not merged)
- Branches with unique commits but no PR

## Common Scenarios

### Post-Merge Cleanup

```
✅ PR #120 merged
→ Delete local: feature/STRUM-XXX-feature
→ Delete remote: origin/feature/STRUM-XXX-feature
```

### Abandoned Work

```
⚠️  PR #113 closed (not merged)
→ Review commits first
→ Save unique work or delete
```

### Work in Progress

```
📝 feature/new-feature: 5 commits, no PR
→ Create PR automatically
→ Link to Linear ticket
```

### Uncommitted Changes

```
⚠️  feature/old-branch: merged, but has uncommitted changes
→ Commit and create new PR
→ Stash for later
→ Discard if obsolete
```

## Scripts

### analyze-branches.sh

Analyzes all branches and their PR status without making changes.

**Features**:
- Color-coded output
- Shows PR numbers and states
- Identifies commits ahead of main
- Detects uncommitted changes
- Suggests next actions

**Usage**:
```bash
cd /Users/piotr/Desktop/guitar-crm
./.claude/skills/git-cleanup/scripts/analyze-branches.sh
```

**Output**:
```
🔍 Analyzing git branches...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOCAL BRANCHES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏠 main (base branch)
✅ feature/STRUM-XXX-active → PR #129 (OPEN)
🗑️  feature/STRUM-XXX-old → PR #120 (MERGED) - can delete
📝 feature/STRUM-XXX-new → No PR, 3 commits ahead of main - needs PR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REMOTE BRANCHES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ feature/STRUM-XXX-active → PR #129 (OPEN)
🗑️  feature/STRUM-96-email → PR #86 (MERGED) - can delete from origin
```

## Integration with Workflow

This skill integrates with the Guitar CRM development workflow:

- **Respects** branch naming conventions
- **Links** to Linear tickets automatically
- **Follows** PR creation standards
- **Maintains** version bump rules
- **Coordinates** with git-workflow agent

## Related Documentation

- `.claude/agents/git-workflow.md` - Full git workflow guide
- `.claude/agents/pr-manager.md` - PR creation standards
- `.claude/agents/linear-coordinator.md` - Linear integration

## Tips

1. **Run weekly** to prevent branch accumulation
2. **Use after merging** multiple PRs to clean up immediately
3. **Check Linear** ticket status before deleting closed PR branches
4. **Communicate** with team before deleting shared remote branches
5. **Keep analysis script** handy for quick status checks

## Troubleshooting

### "remote ref does not exist"

Branch already deleted on GitHub. Run `git fetch --prune` to clean local refs.

### "uncommitted changes"

Commit, stash, or discard changes before deleting branch.

### "branch not fully merged"

Use `-D` flag for force delete only if you're certain it's safe.

### PR creation fails

Ensure branch has commits ahead of main and is pushed to origin.

## Version

Skill version: 1.0.0
Created: 2026-02-14
Last updated: 2026-02-14
