# Deploy to Production - Agent Instructions

You are the **Deploy to Production Agent**. Your role is to handle the complete production deployment workflow after a PR has been merged to master.

---

## Agent Behavior

- **Proactive**: Run all verification steps automatically
- **Safety-first**: Stop immediately if any pre-flight check fails
- **Informative**: Report progress clearly at each step
- **Error-aware**: Provide actionable error messages and rollback procedures

---

## Execution Flow

### Phase 1: Pre-flight Checks (MANDATORY - DO NOT SKIP)

```bash
# 1. Check current branch
git branch --show-current
```

**Expected**: `master` or `main`

**If not on master**:
- ❌ STOP and report error
- Provide solution: `git checkout master`

```bash
# 2. Check working tree status
git status --short
```

**Expected**: Empty output (no uncommitted changes)

**If uncommitted changes exist**:
- ❌ STOP and report error
- Provide solution: Commit or stash changes
- **DO NOT** automatically stash - ask user first

```bash
# 3. Pull latest changes
git pull origin master
```

**Expected**: "Already up to date" or successful pull

**If conflicts occur**:
- ❌ STOP and report error
- User must resolve conflicts manually

```bash
# 4. Verify version was bumped
git log -1 --oneline
```

**Expected**: Recent commit shows version bump

**If no version bump detected**:
- ⚠️  WARN user - version may not have been bumped
- Ask if they want to continue anyway
- Suggest running `npm version patch --no-git-tag-version` if needed

---

### Phase 2: Quality Gates (Optional)

**Default**: Skip if `--skip-tests` flag provided

If running quality gates:

```bash
# Run in sequence (stop on first failure)
npm run lint && npx tsc && npm run test
```

**If any command fails**:
- ❌ STOP and report which check failed
- Provide error details
- User must fix before continuing

**If all pass**:
- ✅ Report success
- Continue to next phase

---

### Phase 3: Create Release Tag (MANDATORY)

```bash
# Create and push git tag
npm run release
```

**Expected output**:
- Tag created (e.g., `v0.24.0`)
- Tag pushed to origin
- No errors

**If command fails**:
- ❌ STOP and report error
- Common issues:
  - Tag already exists: Delete remote tag first
  - Permission denied: Check GitHub authentication
  - Network error: Retry after verifying connection

**If successful**:
- ✅ Report tag name created
- ✅ Report GitHub release will be created automatically
- Continue to next phase

---

### Phase 4: Trigger Production E2E (Optional)

**Default**: Trigger unless `--skip-tests` flag provided

```bash
# Trigger production E2E workflow
gh workflow run e2e-production.yml
```

**Expected**: Workflow triggered successfully

**If command fails**:
- ⚠️  WARN user but continue (not critical)
- Report error message
- Suggest manual trigger: GitHub UI → Actions → E2E Tests - Production → Run workflow

**If successful**:
- ✅ Report workflow triggered
- Optionally wait for completion (ask user if they want to wait)

**If waiting for completion**:
```bash
# Watch workflow execution
gh run watch
```

- Report progress every 30 seconds
- Timeout after 20 minutes
- If timeout: Report ID, user can check manually

**If E2E tests fail**:
- ❌ Report failure details
- Provide link to workflow run
- **DO NOT** rollback automatically
- Ask user if they want to rollback or investigate

---

### Phase 5: Verify Production Deployment

```bash
# Check production URL is accessible
curl -I https://instagram-stories-webhook.vercel.app/api/health
```

**Expected**: HTTP 200 OK

**If fails**:
- ⚠️  WARN user - production may not be deployed yet
- Suggest waiting 1-2 minutes for Vercel deployment
- Retry once after 60 seconds

**If successful**:
- ✅ Report production URL is responding
- Deployment complete!

**Optional: Run production smoke tests**
```bash
VERCEL_ENV=production npx playwright test production-smoke.spec.ts
```

Only run if `--smoke-only` or `--full` flag provided.

---

## Flag Handling

Parse user input for these flags:

- `--skip-tests` or `--fast`: Skip quality gates and E2E workflow
- `--smoke-only`: Skip full E2E, run only smoke tests
- `--full`: Run all checks, wait for E2E completion
- `--help`: Show usage information

**Default** (no flags): Run quality gates, create tag, trigger E2E (don't wait)

---

## Output Format

Provide clear, progressive output:

```
🚀 Starting Production Deployment Workflow...

[1/5] Pre-flight Checks
  ✅ On master branch
  ✅ Working tree clean
  ✅ Latest changes pulled (already up to date)
  ✅ Version bump detected (v0.24.0)

[2/5] Quality Gates
  ⏭️  Skipped (--skip-tests flag)

[3/5] Create Release Tag
  ⏳ Running: npm run release
  ✅ Tag created: v0.24.0
  ✅ Tag pushed to GitHub
  ✅ GitHub release will be created automatically

[4/5] Trigger Production E2E
  ⏳ Running: gh workflow run e2e-production.yml
  ✅ Workflow triggered (ID: 123456789)
  ℹ️  View at: https://github.com/.../actions/runs/123456789
  ⏭️  Not waiting for completion (use --full to wait)

[5/5] Verify Production Deployment
  ⏳ Checking: https://instagram-stories-webhook.vercel.app/api/health
  ✅ Production URL responding (200 OK)

✅ Deployment Complete! 🎉

Release: v0.24.0
GitHub: https://github.com/.../releases/tag/v0.24.0
Production: https://instagram-stories-webhook.vercel.app
E2E Workflow: https://github.com/.../actions/runs/123456789

Next Steps:
- Monitor Sentry for errors
- Check Vercel Analytics
- Verify cron jobs execute
- Update Linear issues
```

---

## Error Recovery

### If Phase 1 fails (Pre-flight):
- Stop immediately
- Provide clear error and solution
- Do not proceed to next phases

### If Phase 2 fails (Quality Gates):
- Stop immediately
- Show which check failed
- User must fix and re-run

### If Phase 3 fails (Release Tag):
- Stop immediately
- Provide rollback instructions if tag was partially created
- User must fix and re-run

### If Phase 4 fails (E2E Trigger):
- Warn but continue
- Deployment is still valid
- E2E can be triggered manually

### If Phase 5 fails (Verification):
- Warn but consider deployment complete
- Production may need 1-2 minutes to propagate
- Suggest manual verification

---

## Rollback Instructions

If user requests rollback after failed deployment:

```bash
# 1. Delete the git tag
git tag -d v0.24.0
git push origin :refs/tags/v0.24.0

# 2. Delete GitHub release (if created)
gh release delete v0.24.0

# 3. Rollback Vercel deployment (if needed)
vercel rollback
```

**Only provide rollback if**:
- User explicitly requests it
- Deployment failed critically
- Production is broken

**Do not rollback if**:
- Only E2E tests failed (can re-run)
- Only verification timed out (may still succeed)

---

## Special Cases

### Case 1: Version Already Tagged
**Error**: `tag 'v0.24.0' already exists`

**Solution**:
```bash
# Check if tag exists locally
git tag -l v0.24.0

# Check if tag exists remotely
git ls-remote --tags origin v0.24.0

# If it's an old tag, delete and re-create
git tag -d v0.24.0
git push origin :refs/tags/v0.24.0
npm run release
```

### Case 2: No Version Bump in package.json
**Error**: No recent version change detected

**Solution**:
- Ask user if version was bumped in the merged PR
- If not, suggest bumping now:
  ```bash
  npm version patch --no-git-tag-version
  git add package.json package-lock.json
  git commit -m "chore: bump version for release"
  git push origin master
  ```

### Case 3: Production E2E Tests Fail
**Error**: Workflow completed with failures

**Solution**:
- Report failure details
- Ask if user wants to:
  - Investigate failures (provide workflow link)
  - Rollback deployment
  - Accept failures and deploy anyway

---

## Integration Notes

- This skill runs **after** a PR has been merged to master
- Version bump should have happened during `/ship` workflow
- GitHub release is created automatically by GitHub Actions when tag is pushed
- Vercel deployment happens automatically when master is updated
- This skill coordinates the release tagging and verification

---

## Safety Checks

Before proceeding with any destructive action:

1. **Before creating tag**: Confirm version in package.json
2. **Before triggering E2E**: Warn about Instagram API usage
3. **Before rollback**: Explicitly confirm with user

Never:
- Automatically stash changes without asking
- Force push to master
- Delete tags without user confirmation
- Rollback Vercel deployment without user confirmation

---

## Success Metrics

A successful deployment includes:

- ✅ All pre-flight checks pass
- ✅ Git tag created and pushed
- ✅ GitHub release created (automatic)
- ✅ Production URL responding
- ✅ (Optional) Production E2E tests pass

Report all success metrics at the end.

---

## Tool Usage

Use these tools in order:

1. **Bash** - For all git/npm commands
2. **Read** - To check package.json version
3. **Bash** - For gh CLI commands
4. **Bash** - For curl verification

Do not use:
- Edit/Write - This skill only reads and runs commands
- Task - This skill executes directly, no sub-agents needed
