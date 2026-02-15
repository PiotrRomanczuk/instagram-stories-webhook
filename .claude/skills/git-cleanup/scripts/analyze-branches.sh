#!/bin/bash

# Git Branch Analyzer
# Analyzes branches and their PR status for cleanup decisions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 Analyzing git branches..."
echo ""

# Fetch latest
git fetch --all --quiet
git fetch --prune --quiet

# Get all PRs
echo "📊 Fetching PR data..."
PR_DATA=$(gh pr list --state all --limit 200 --json number,title,headRefName,state)

# Analyze local branches
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "LOCAL BRANCHES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CURRENT_BRANCH=$(git branch --show-current)

git branch | while read -r branch; do
  # Remove leading whitespace and asterisk
  branch=$(echo "$branch" | sed 's/^[* ]*//')

  # Skip if empty
  [ -z "$branch" ] && continue

  # Check if base branch
  if [[ "$branch" == "main" ]] || [[ "$branch" == "production" ]] || [[ "$branch" == "develop" ]]; then
    echo -e "${BLUE}🏠 $branch${NC} (base branch)"
    continue
  fi

  # Check for PR
  PR_INFO=$(echo "$PR_DATA" | jq -r ".[] | select(.headRefName == \"$branch\") | \"\(.number)|\(.state)|\(.title)\"" | head -1)

  if [ -n "$PR_INFO" ]; then
    PR_NUM=$(echo "$PR_INFO" | cut -d'|' -f1)
    PR_STATE=$(echo "$PR_INFO" | cut -d'|' -f2)
    PR_TITLE=$(echo "$PR_INFO" | cut -d'|' -f3)

    if [ "$PR_STATE" == "OPEN" ]; then
      echo -e "${GREEN}✅ $branch${NC} → PR #$PR_NUM (OPEN)"
    elif [ "$PR_STATE" == "MERGED" ]; then
      echo -e "${RED}🗑️  $branch${NC} → PR #$PR_NUM (MERGED) - can delete"
    elif [ "$PR_STATE" == "CLOSED" ]; then
      echo -e "${RED}🗑️  $branch${NC} → PR #$PR_NUM (CLOSED) - can delete"
    fi
  else
    # No PR - check for commits
    COMMITS=$(git log main..$branch --oneline 2>/dev/null | wc -l | tr -d ' ')
    if [ "$COMMITS" -gt 0 ]; then
      echo -e "${YELLOW}📝 $branch${NC} → No PR, $COMMITS commits ahead of main - needs PR"
    else
      echo -e "${RED}🗑️  $branch${NC} → No PR, no commits - can delete"
    fi
  fi

  # Check for uncommitted changes
  if [ "$branch" == "$CURRENT_BRANCH" ]; then
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
      echo -e "   ${YELLOW}⚠️  Has uncommitted changes${NC}"
    fi
  fi
done

# Analyze remote branches
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "REMOTE BRANCHES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git branch -r | grep -v "HEAD" | while read -r remote_branch; do
  # Remove leading whitespace
  remote_branch=$(echo "$remote_branch" | sed 's/^[* ]*//')

  # Extract branch name (remove origin/ prefix)
  branch=${remote_branch#origin/}

  # Skip if empty or base branch
  [ -z "$branch" ] && continue
  [[ "$branch" == "main" ]] || [[ "$branch" == "production" ]] || [[ "$branch" == "develop" ]] && continue

  # Check for PR
  PR_INFO=$(echo "$PR_DATA" | jq -r ".[] | select(.headRefName == \"$branch\") | \"\(.number)|\(.state)|\(.title)\"" | head -1)

  if [ -n "$PR_INFO" ]; then
    PR_NUM=$(echo "$PR_INFO" | cut -d'|' -f1)
    PR_STATE=$(echo "$PR_INFO" | cut -d'|' -f2)

    if [ "$PR_STATE" == "OPEN" ]; then
      echo -e "${GREEN}✅ $branch${NC} → PR #$PR_NUM (OPEN)"
    elif [ "$PR_STATE" == "MERGED" ]; then
      echo -e "${RED}🗑️  $branch${NC} → PR #$PR_NUM (MERGED) - can delete from origin"
    elif [ "$PR_STATE" == "CLOSED" ]; then
      echo -e "${YELLOW}⚠️  $branch${NC} → PR #$PR_NUM (CLOSED) - review before deleting"
    fi
  else
    echo -e "${YELLOW}❓ $branch${NC} → No PR found"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Analysis complete"
echo ""
echo "Next steps:"
echo "  1. Delete local merged/closed branches: git branch -D <branch-name>"
echo "  2. Delete remote merged branches: git push origin --delete <branch-name>"
echo "  3. Create PRs for branches with commits: gh pr create"
echo "  4. Commit or stash uncommitted changes"
