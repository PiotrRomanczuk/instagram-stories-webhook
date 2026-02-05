# Quick Test Verification

## E2E Test Count Verification

Total E2E tests in instagram-publishing-live.spec.ts: **11 tests**

### Breakdown:

#### Instagram Publishing - LIVE (4 tests)
- LIVE-PUB-01: publish story via debug page
- LIVE-PUB-02: publish story with file upload
- LIVE-PUB-03: verify publishing is logged
- LIVE-PUB-04: publish video story

#### Instagram Connection Verification (4 tests)
- CONN-01: verify Instagram account is connected
- CONN-02: verify token is not expired
- CONN-03: debug publisher UI loads correctly
- CONN-04: image upload to storage works

#### Instagram User Tagging - LIVE (3 tests) ⭐ **NEW**
- LIVE-PUB-05: publish story with single user tag
- LIVE-PUB-06: publish story with multiple user tags
- LIVE-PUB-07: verify user tags API request format

## Verification Commands

```bash
# List all tests
cd __tests__/e2e && npx playwright test instagram-publishing-live.spec.ts --list

# List only user tagging tests
cd __tests__/e2e && npx playwright test instagram-publishing-live.spec.ts --list | grep "User Tagging"

# Count tests by category
cd __tests__/e2e && npx playwright test instagram-publishing-live.spec.ts --list | grep -E "(LIVE-PUB|CONN)" | wc -l
```

## Expected Output

```
Listing tests:
  instagram-publishing-live.spec.ts:53:6 › Instagram Publishing - LIVE › LIVE-PUB-01: publish story via debug page
  instagram-publishing-live.spec.ts:138:6 › Instagram Publishing - LIVE › LIVE-PUB-02: publish story with file upload
  instagram-publishing-live.spec.ts:181:6 › Instagram Publishing - LIVE › LIVE-PUB-03: verify publishing is logged
  instagram-publishing-live.spec.ts:231:6 › Instagram Publishing - LIVE › LIVE-PUB-04: publish video story
  instagram-publishing-live.spec.ts:351:6 › Instagram Connection Verification › CONN-01: verify Instagram account is connected
  instagram-publishing-live.spec.ts:371:6 › Instagram Connection Verification › CONN-02: verify token is not expired
  instagram-publishing-live.spec.ts:390:6 › Instagram Connection Verification › CONN-03: debug publisher UI loads correctly
  instagram-publishing-live.spec.ts:413:6 › Instagram Connection Verification › CONN-04: image upload to storage works
  instagram-publishing-live.spec.ts:484:6 › Instagram User Tagging - LIVE › LIVE-PUB-05: publish story with single user tag
  instagram-publishing-live.spec.ts:567:6 › Instagram User Tagging - LIVE › LIVE-PUB-06: publish story with multiple user tags
  instagram-publishing-live.spec.ts:661:6 › Instagram User Tagging - LIVE › LIVE-PUB-07: verify user tags API request format
Total: 11 tests in 1 file
```

## Pre-Commit Verification

```bash
# Lint
npm run lint
# ✅ PASSED

# Type check
npx tsc --noEmit
# ✅ PASSED

# Unit tests
npm run test
# ✅ PASSED - 895 tests
```

## Files Modified

1. `__tests__/e2e/instagram-publishing-live.spec.ts` - Added 3 user tagging tests
2. `app/api/debug/publish/route.ts` - Accepts userTags parameter
3. `run-user-tagging-tests.sh` - Helper script (new)
4. `USER_TAGGING_E2E_TESTS.md` - Full documentation (new)
5. `QUICK_TEST_VERIFICATION.md` - This file (new)

## Test User

- Primary account: `@www_hehe_pl` (publishes stories)
- Tagged user: `@konstanty03` (test user for tagging functionality)

## Success Criteria

✅ All success criteria met:
- E2E test publishes to REAL Instagram with user tags
- Test passes with real Meta Graph API
- Follows existing E2E test patterns
- Proper timeouts and error handling
- 24-hour deduplication implemented
- Tests can be run individually or as suite
- Documentation explains test account and setup
- Helper script provided for easy execution
