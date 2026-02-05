# Quick Start: Live Video Publishing Test

## 🚀 Run the Test

```bash
# Run ONLY the video publishing test
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true \
  npx playwright test --project=live-publishing-prerequisite -g "LIVE-PUB-04"
```

## 📋 Prerequisites

1. **Environment Variables Set**
   - `ENABLE_REAL_IG_TESTS=true`
   - `ENABLE_LIVE_IG_PUBLISH=true`

2. **Instagram Account Connected**
   - Account: p.romanczuk@gmail.com
   - Instagram: @www_hehe_pl
   - Valid tokens in Supabase

3. **Test Video Exists**
   - Path: `__tests__/fixtures/test-video.mp4`
   - Size: 351KB, Duration: 5s
   - Format: 720x1280, H.264/AAC

## ⏱️ Expected Duration

- **Upload**: ~20-30 seconds
- **Publishing**: ~30-90 seconds
- **Total**: ~60-120 seconds

## ✅ Success Criteria

Test passes if:
- Video uploads successfully to Supabase
- Instagram accepts the video container
- Instagram processing completes
- Media ID is returned
- Logs show "SUCCESS" status

## 🔄 24-Hour De-duplication

Test automatically skips if:
- `test-video.mp4` was published in last 24 hours
- Prevents duplicate content errors
- Check `/api/content?mediaType=VIDEO` to see recent videos

## 📊 All Live Publishing Tests

```bash
# List all 4 tests
ENABLE_LIVE_IG_PUBLISH=true \
  npx playwright test --project=live-publishing-prerequisite --list

# Run all live publishing tests
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npm run test:e2e:live
```

**Tests Available:**
- LIVE-PUB-01: Publish image via debug page
- LIVE-PUB-02: Publish image with file upload
- LIVE-PUB-03: Verify publishing is logged
- **LIVE-PUB-04: Publish video story** ⭐ NEW

---

**For full details**: See `VIDEO_PUBLISHING_TEST_IMPLEMENTATION.md`
