# Changelog Generator

Generates CHANGELOG.md entries from merged PRs and commit history, organized by type.

## Usage

Invoke after a release or before version bumping to generate changelog entries.

## Workflow

### 1. Gather Merged PRs Since Last Release

```bash
# Find the last version tag or release
git tag --sort=-creatordate | head -1

# List PRs merged since last tag
gh pr list --state merged --base master --search "merged:>$(git log $(git tag --sort=-creatordate | head -1) -1 --format=%ci | cut -d' ' -f1)" --json number,title,labels,mergedAt,author --jq '.[] | "- \(.title) (#\(.number)) @\(.author.login)"'
```

### 2. Categorize by Type

Categorize based on PR title prefix or branch name:

| Prefix | Category |
|--------|----------|
| `feat:` / `feature/` | Added |
| `fix:` / `fix/` | Fixed |
| `refactor:` / `refactor/` | Changed |
| `perf:` | Performance |
| `docs:` | Documentation |
| `test:` | Tests |
| `chore:` / `ci:` | Maintenance |

### 3. Generate Entry

Format following [Keep a Changelog](https://keepachangelog.com/):

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- Feature description (#PR) @author

### Fixed
- Bug fix description (#PR) @author

### Changed
- Refactoring description (#PR) @author
```

### 4. Prepend to CHANGELOG.md

Insert the new entry at the top of the file, below the header.

## Commit Message Mining

If PRs aren't available, fall back to commit messages:

```bash
# Commits since last tag, grouped by type
git log $(git tag --sort=-creatordate | head -1)..HEAD --oneline --no-merges | \
  grep -E "^[a-f0-9]+ (feat|fix|refactor|perf|docs|test|chore)"
```

## Linear Integration

Include Linear ticket references when present in branch names or PR titles:

```
- Add scheduling conflict detection (BMS-42) (#PR) @author
```
