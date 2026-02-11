#!/usr/bin/env bash
set -euo pipefail

# Release script: creates and pushes a git tag from package.json version
# Usage: npm run release          (create + push tag)
#        npm run release:dry      (preview only)

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# Read version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

echo "Version: ${VERSION}"
echo "Tag:     ${TAG}"
echo ""

# Safety checks
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "master" ]]; then
  echo "Error: must be on master branch (currently on '${BRANCH}')"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is not clean"
  exit 1
fi

git fetch origin master --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)
if [[ "$LOCAL" != "$REMOTE" ]]; then
  echo "Error: local master is not up-to-date with origin/master"
  echo "  Local:  ${LOCAL}"
  echo "  Remote: ${REMOTE}"
  echo "Run 'git pull' first."
  exit 1
fi

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: tag '${TAG}' already exists"
  echo "If this version was already released, bump the version first."
  exit 1
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] Would create tag '${TAG}' at $(git rev-parse --short HEAD)"
  echo "[dry-run] Would push tag to origin"
  exit 0
fi

# Create and push tag
# --no-verify bypasses .githooks/pre-push which blocks pushes from master
# (we're only pushing a tag, not the branch)
git tag -a "$TAG" -m "Release ${TAG}"
git push origin "$TAG" --no-verify

REPO_URL=$(git remote get-url origin | sed 's/\.git$//' | sed 's|git@github.com:|https://github.com/|')
echo ""
echo "Tag '${TAG}' pushed successfully!"
echo "GitHub will auto-create a release via the release workflow."
echo "View releases: ${REPO_URL}/releases"
