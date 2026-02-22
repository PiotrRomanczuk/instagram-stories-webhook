# Deploy to Production

**Trigger**: `/deploy-production` or `/deploy` or `/prod`

**Description**: Production deployment is now **fully automated** via the `deploy-production.yml` GitHub Actions workflow. Pushes to `master` are automatically deployed through a preview-test-promote pipeline.

---

## How It Works

Production deployment is **gated behind E2E tests**. Vercel auto-deploy is disabled for `master`. Instead:

```
Push to master
    |
    v
[Job 1: Quality Gates] (~3-4 min)
  lint -> typecheck -> unit tests
    |
    v (passes)
[Job 2: Deploy Preview] (~3 min)
  vercel deploy (WITHOUT --prod) -> outputs preview URL
    |
    v (preview deployed)
[Job 3: E2E Tests against Preview - 5 shards] (~10-14 min, parallel)
  Run ALL E2E tests against the REAL Vercel preview deployment
  Excludes only live Instagram publishing (CI=true guard)
    |
    v (ALL shards pass)
[Job 4: Promote to Production] (~1 min)
  vercel promote <preview-url> -> assigns production domain
  Verify production URL returns 200
```

### Key Safety Properties

- **Production is NEVER broken** — promotion only happens after tests pass
- **No rollback needed** — bad code never reaches production
- **Tests real infrastructure** — catches Vercel-specific issues (env vars, edge functions, CDN)
- **Automatic** — no manual intervention needed after merge

---

## When to Use This Skill

This skill is now primarily for:

1. **Manual release tagging** after the automated pipeline completes
2. **Post-deployment verification** and history documentation
3. **Troubleshooting** failed pipeline runs

### Basic Usage — Post-Deploy Tasks
```bash
/deploy
```
Creates release tag, updates feature history documentation.

### Tag Only — Create Release
```bash
/deploy --tag-only
```
Just creates and pushes the git tag (triggers GitHub release).

---

## Workflow Steps

### Step 1: Verify Pipeline Passed
```bash
# Check the deploy-production workflow status
gh run list --workflow=deploy-production.yml --limit=3

# View the latest run details
gh run view --log
```

### Step 2: Create Release Tag
```bash
# Verify on master branch
git branch --show-current
git pull origin master

# Create and push git tag (triggers GitHub release)
npm run release
```

### Step 3: Update Feature Implementation History
```bash
# Check for version gaps
npm run check-history

# Add version entry to history doc
# docs/non-technical/FEATURE_IMPLEMENTATION_HISTORY.md

# Get accurate work data
npx tsx scripts/work-hours.ts --verbose

# Commit the history update
git add docs/non-technical/FEATURE_IMPLEMENTATION_HISTORY.md
git commit -m "docs: update feature history for vX.Y.Z"
git push origin master
```

---

## Pipeline Configuration

### Files
- `.github/workflows/deploy-production.yml` — The pipeline workflow
- `playwright.config.ci.ts` — E2E test config for CI (tests against preview URL)
- `vercel.json` — `git.deploymentEnabled.master: false` disables auto-deploy

### Environment Variables Required (GitHub Secrets)
- `VERCEL_TOKEN` — Vercel API token for deploy/promote
- `VERCEL_ORG_ID` — Vercel organization ID
- `VERCEL_PROJECT_ID` — Vercel project ID
- All Supabase, auth, and test secrets (same as existing workflows)

---

## Error Handling

### Pipeline failed at Quality Gates
**Solution**: Fix lint/type/test errors and push again
```bash
npm run lint && npx tsc && npm run test
```

### Pipeline failed at E2E Tests
**Solution**: Production stays on previous version. Investigate failures.
```bash
# View failed shard details
gh run view --log-failed

# Fix issues, push to master (triggers new pipeline run)
```

### Pipeline failed at Promotion
**Solution**: Preview passed tests but promotion failed. Check Vercel.
```bash
vercel inspect
# Re-run the workflow
gh workflow run deploy-production.yml
```

### Need to deploy urgently (bypass pipeline)
**Solution**: Manual Vercel deploy (use sparingly)
```bash
vercel --prod --token=$VERCEL_TOKEN
```

---

## Timing

| Stage | Duration |
|-------|----------|
| Quality Gates (lint, tsc, unit tests) | ~3-4 min |
| Vercel Preview Deploy | ~3 min |
| E2E Tests (5 parallel shards) | ~10-14 min |
| Promote to Production + Verify | ~1 min |
| **Total** | **~17-22 min** |

---

## Related

- `/ship` — Create PR with version bump, tests, and Linear updates
- `/merge-fleet` — Bulk merge PRs with CI fixes
- `.github/workflows/e2e-preview.yml` — Preview E2E tests for PRs
- `.github/workflows/e2e-production.yml` — Manual post-deploy verification
