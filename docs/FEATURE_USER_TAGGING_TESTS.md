# Instagram User Tagging E2E Tests

## Overview

E2E tests for Instagram Stories with user tags functionality. These tests **ACTUALLY PUBLISH** to a real Instagram account to verify end-to-end functionality.

## Test Account

- **Email**: `p.romanczuk@gmail.com`
- **Instagram**: `@www_hehe_pl` (Business Account)
- **Test User for Tagging**: `@konstanty03`

## Tests Included

### LIVE-PUB-05: Publish story with single user tag
- Publishes an image story with one user tag (@konstanty03)
- Verifies tag is included in API request
- Confirms successful publishing to real Instagram
- Validates publishing log entry
- **Timeout**: 60s for image publishing
- **24-hour deduplication**: Skips if content recently published

### LIVE-PUB-06: Publish story with multiple user tags
- Publishes an image story with 3 user tags:
  - `@konstanty03` (left side, x=0.3, y=0.4)
  - `@test_account_ig` (right side, x=0.7, y=0.4)
  - `@demo_user_instagram` (center, x=0.5, y=0.7)
- Verifies all tags are included in API request
- Confirms successful publishing to real Instagram
- Validates publishing log entry
- **Timeout**: 60s for image publishing
- **24-hour deduplication**: Skips if content recently published

### LIVE-PUB-07: Verify user tags API request format
- Tests correct formatting of user tags in API request
- Publishes with a single tag at specific coordinates
- Verifies tag data structure:
  ```json
  {
    "username": "konstanty03",
    "x": 0.25,
    "y": 0.75
  }
  ```
- Confirms API processes tags correctly
- **Timeout**: 60s for image publishing
- **24-hour deduplication**: Skips if content recently published

## Running the Tests

### All User Tagging Tests

```bash
# Run all user tagging tests
./scripts/run-user-tagging-tests.sh
```

### Individual Test

```bash
# LIVE-PUB-05: Single user tag
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true \
  npx playwright test instagram-publishing-live.spec.ts -g "LIVE-PUB-05"

# LIVE-PUB-06: Multiple user tags
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true \
  npx playwright test instagram-publishing-live.spec.ts -g "LIVE-PUB-06"

# LIVE-PUB-07: API request format
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true \
  npx playwright test instagram-publishing-live.spec.ts -g "LIVE-PUB-07"
```

### All Instagram Publishing Tests (Including User Tagging)

```bash
# Run ALL live publishing tests (images, videos, tags)
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true \
  npm run test:e2e:live
```

## Environment Requirements

### Required Environment Variables

```bash
ENABLE_REAL_IG_TESTS=true       # Enable real Instagram API tests
ENABLE_LIVE_IG_PUBLISH=true     # ACTUALLY publish to Instagram (double opt-in)
```

### Development Mode Only

Tests are blocked in production:
- `NODE_ENV !== 'production'`
- Tests will not run in CI/CD pipeline
- Requires local development environment

### Valid Instagram Tokens

- Tokens must be stored in Supabase `oauth_tokens` table
- Account: `p.romanczuk@gmail.com`
- Instagram Business Account ID must be linked
- Tokens must not be expired

## Implementation Details

### API Endpoint

**POST** `/api/debug/publish`

Request body:
```typescript
{
  url: string;                          // Image/video URL
  type: 'IMAGE' | 'VIDEO';              // Media type
  userTags?: Array<{                    // Optional user tags
    username: string;                   // Instagram username (without @)
    x: number;                          // X coordinate (0.0 - 1.0)
    y: number;                          // Y coordinate (0.0 - 1.0)
  }>;
}
```

Response:
```typescript
{
  success: boolean;
  result?: {
    id: string;                         // Instagram Media ID
  };
  error?: string;
  duration: number;                     // Request duration (ms)
  logs: string[];                       // Server-side logs
}
```

### Backend Function

`lib/instagram/publish.ts` - `publishMedia()`

```typescript
async function publishMedia(
  url: string,
  mediaType: MediaType,
  postType: PostType,
  caption?: string,
  userId?: string,
  userTags?: Array<{
    username: string;
    x: number;
    y: number;
  }>
)
```

User tags are passed to Instagram Graph API container creation:
```typescript
{
  image_url: url,
  media_type: 'STORIES',
  access_token: token,
  user_tags: [
    { username: 'konstanty03', x: 0.5, y: 0.5 }
  ]
}
```

## Test Safety Features

### 24-Hour Deduplication

Tests check if content was published in the last 24 hours:
```typescript
const testImagePath = await getUnpublishedMeme(request);
if (!testImagePath) {
  console.warn('⚠️ All memes were published in the last 24 hours');
  test.skip();
  return;
}
```

**Why?**
- Prevents duplicate content errors from Instagram
- Avoids rate limiting issues
- Tests skip gracefully if recently published

### Extended Timeouts

- **Image publishing**: 60s (real Instagram API delays)
- **Video publishing**: 120s (video transcoding is slow)
- **Upload**: 30s (Supabase upload time)

**Why?**
- Real API calls have variable latency
- Instagram processing is not instant
- Network conditions affect uploads

### Real API - No Mocking

**CRITICAL**: E2E tests ALWAYS use REAL Instagram account. NEVER mock Meta API in E2E tests.

**Why?**
- Instagram API is complex and behavior changes over time
- Mocking doesn't catch real API behavior
- Container status polling timing matters
- Rate limiting must be tested with real API
- Token expiration handling requires real tokens

## Tag Coordinate System

Instagram uses normalized coordinates for user tags:

- **X-axis**: 0.0 (left) to 1.0 (right)
- **Y-axis**: 0.0 (top) to 1.0 (bottom)
- **Center**: x=0.5, y=0.5

Example positions:
```typescript
// Top-left corner
{ x: 0.1, y: 0.1 }

// Center
{ x: 0.5, y: 0.5 }

// Bottom-right corner
{ x: 0.9, y: 0.9 }

// Left side, middle
{ x: 0.3, y: 0.5 }

// Right side, middle
{ x: 0.7, y: 0.5 }
```

## Troubleshooting

### Test Skipped: "All memes published in last 24 hours"

**Solution**: Wait 24 hours or manually clear recent publishing logs.

### Test Failed: "Token expired"

**Solution**: Re-authenticate Instagram account:
1. Visit `/debug` page
2. Check Instagram Connection status
3. Re-link Facebook/Instagram if expired

### Test Failed: "Rate limit exceeded"

**Solution**: Wait 24 hours before retrying. Instagram has strict rate limits.

### Test Failed: "Invalid user tag"

**Possible causes**:
- Username doesn't exist
- Username is private account (can't tag)
- Coordinates out of range (must be 0.0-1.0)

### Test Timeout

**If image publishing times out (>60s)**:
- Check Instagram API status
- Verify network connectivity
- Check Supabase storage upload speed

**If video publishing times out (>120s)**:
- Video transcoding can take 30-90s
- Instagram may be under heavy load
- Retry later

## CI/CD

**Tests are DISABLED in CI/CD:**
```typescript
test.skip(
  () => process.env.CI === 'true',
  'NEVER run live publishing tests in CI'
);
```

**Why?**
- Live publishing should not run automatically
- Prevents accidental spam to Instagram
- Requires manual verification
- Protects against token quota exhaustion

## Related Documentation

- [CLAUDE.md](./CLAUDE.md) - E2E testing policy
- [instagram-publishing-live.spec.ts](./__tests__/e2e/instagram-publishing-live.spec.ts) - Full test suite
- [test-assets.ts](./__tests__/e2e/helpers/test-assets.ts) - Test helpers
- [publish.ts](./lib/instagram/publish.ts) - Backend implementation

## Success Criteria

✅ E2E test publishes to REAL Instagram with user tags (@konstanty03)
✅ Test passes with real Meta Graph API
✅ Follows existing E2E test patterns
✅ Proper timeouts and error handling
✅ 24-hour deduplication implemented
✅ Tests can be run individually or as suite
✅ Documentation explains test account and setup
✅ Helper script provided for easy execution
