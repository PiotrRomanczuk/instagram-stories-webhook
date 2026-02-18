# Meme Deduplication in Live Publishing Tests

## Overview

Added verification to prevent publishing the same meme to Instagram within 24 hours during E2E tests. This ensures we don't spam the Instagram account with duplicate content and makes the tests more realistic.

## Implementation

### New Helper Function: `getUnpublishedMeme()`

**Location**: `__tests__/e2e/helpers/test-assets.ts`

**Purpose**: Select a meme that hasn't been published in the last 24 hours

**How it works**:
1. Queries the `/api/content` endpoint to get recently published content (last 100 items)
2. Filters for content published in the last 24 hours
3. Extracts filenames from `mediaUrl` and `storagePath` fields
4. Compares available memes against recently published list
5. Returns the first unpublished meme, or `null` if all were recently published

**Fallback Strategy**:
- If API query fails: Falls back to random meme selection
- If all memes were published: Test is skipped with warning message

### Updated Tests

All three live publishing tests now use this verification:

1. **LIVE-PUB-01: publish story via debug page**
   - Verifies meme wasn't published in last 24 hours
   - Skips test if all memes were recently published

2. **LIVE-PUB-02: publish story with file upload**
   - Same verification as LIVE-PUB-01
   - Ensures unique content for file upload test

3. **LIVE-PUB-03: verify publishing is logged**
   - Verifies meme hasn't been published before checking logs
   - Prevents duplicate entries in publishing logs

## Usage

### In Tests

```typescript
// Before (static meme selection)
const testImagePath = getMemeByIndex(20);

// After (dynamic unpublished meme selection)
const testImagePath = await getUnpublishedMeme(request);

if (!testImagePath) {
  console.warn('⚠️ All memes were published in the last 24 hours, skipping test');
  test.skip();
  return;
}
```

### Console Output

When test runs, you'll see:
```
📊 Recently published (24h): 5 memes
✅ Selected unpublished meme: meme-043.jpg
```

If all memes were recently published:
```
⚠️ All memes were published in the last 24 hours!
⚠️ All memes were published in the last 24 hours, skipping test
```

## Benefits

✅ **Prevents Duplicate Posts**: No more publishing the same meme multiple times per day
✅ **More Realistic Testing**: Simulates actual user behavior (unique content)
✅ **Instagram Account Health**: Avoids spam-like behavior that could trigger Instagram limits
✅ **Graceful Degradation**: Falls back to random selection if API check fails
✅ **Clear Logging**: Console output shows which meme was selected and why

## Edge Cases Handled

### 1. API Failure
If the content API is unavailable:
```typescript
console.error('❌ Error checking publishing history:', error);
return getRandomMeme(); // Fallback to random
```

### 2. All Memes Published
If every meme was published in last 24 hours:
```typescript
console.warn('⚠️ All memes were published in the last 24 hours!');
return null; // Test will be skipped
```

### 3. Invalid URLs
Handles both full URLs and file paths:
```typescript
function extractFilenameFromUrl(url: string): string | null {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);
      return path.basename(urlObj.pathname);
    }
    return path.basename(url);
  } catch (error) {
    return null;
  }
}
```

### 4. Empty Response
Handles cases where no content exists:
```typescript
if (data.items && Array.isArray(data.items)) {
  // Process items
} else {
  // Return unpublished meme
}
```

## Configuration

### Time Window

Currently set to 24 hours:
```typescript
const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
```

To change the time window, modify this value in `getUnpublishedMeme()`.

### Content Query Limit

Queries last 100 content items:
```typescript
const response = await request.get('/api/content?limit=100&sortBy=newest');
```

Increase if you publish more than 100 items per day.

## Testing

To verify the deduplication works:

1. **Run test multiple times in a row:**
   ```bash
   npm run test:e2e:live
   ```
   Each run should select a different meme (if available)

2. **Check console output:**
   ```bash
   ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npm run test:e2e 2>&1 | grep -E "(Recently published|Selected unpublished)"
   ```

3. **Verify in database:**
   Check the `content_items` table to confirm no duplicates within 24 hours:
   ```sql
   SELECT media_url, published_at
   FROM content_items
   WHERE published_at > NOW() - INTERVAL '24 hours'
   ORDER BY published_at DESC;
   ```

## Future Enhancements

Potential improvements for the future:

1. **Configurable Time Window**: Make the 24-hour window configurable via environment variable
2. **Content Hash Matching**: Use `contentHash` field for more accurate duplicate detection
3. **Meme Pool Rotation**: Implement round-robin selection to ensure all memes get tested over time
4. **Test Metrics**: Track which memes have been tested and how often
5. **Priority Selection**: Prioritize memes that haven't been tested in the longest time

## Related Files

- `__tests__/e2e/helpers/test-assets.ts` - Helper functions for meme selection
- `__tests__/e2e/instagram-publishing-live.spec.ts` - Live publishing tests
- `lib/types/posts.ts` - ContentItem type definition
- `lib/content-db.ts` - Content database queries

## Notes

- The helper function requires Playwright's `APIRequestContext` for making API calls
- All connection verification tests (CONN-01 through CONN-04) still use static meme selection since they don't actually publish
- The function is designed to be resilient - it will never cause a test to fail, only skip if necessary
