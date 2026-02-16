# Video Journey Implementation Plan

**Project:** instagram-stories-webhook
**Date:** 2026-02-16
**Team:** video-journey-implementation
**Status:** In Progress

---

## Executive Summary

This implementation plan addresses gaps and limitations in the mobile user journey for Instagram Stories video posting. The plan is organized into three phases: **Immediate Actions** (production blockers), **Short-Term Improvements** (UX enhancements), and **Long-Term Enhancements** (advanced features).

**Key Problem:** FFmpeg is NOT available in Vercel serverless environment, blocking video processing in production.

**Primary Goals:**
1. Enable video processing in production via Cloudinary
2. Improve video preview and validation UX
3. Enhance mobile timeline with video-specific features

---

## Phase 1: Immediate Actions (Production Blockers)

### Task #1: FFmpeg Alternative - Cloudinary Integration
**Priority:** 🔴 CRITICAL
**Status:** Pending
**Estimated Effort:** 1 day

**Problem:**
- FFmpeg unavailable in Vercel serverless functions
- Video processing fails in production
- Users cannot publish non-compliant videos

**Solution:**
- Integrate Cloudinary for video processing
- Add fallback to accept compliant videos as-is
- Document limitations clearly in UI

**Implementation:**
```typescript
// lib/media/video-processor.ts
export async function processVideoForStory(
  inputPath: string,
  outputPath: string
): Promise<void> {
  // Check if FFmpeg available (local dev)
  if (isFFmpegAvailable()) {
    return processWithFFmpeg(inputPath, outputPath);
  }

  // Use Cloudinary in production
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    return processWithCloudinary(inputPath, outputPath);
  }

  // Fallback: accept as-is if already compliant
  const validation = await validateVideoForStories(inputPath);
  if (!validation.needsProcessing) {
    return; // Video is already compliant
  }

  throw new Error('Video processing unavailable. Please upload a compliant video.');
}
```

**Files Modified:**
- `lib/media/video-processor.ts` - Add Cloudinary integration
- `app/components/media/video-uploader.tsx` - Show clear error messages
- `.env.example` - Add Cloudinary variables
- `package.json` - Add `cloudinary` dependency

**Environment Variables:**
```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Acceptance Criteria:**
- ✅ Video processing works in production via Cloudinary
- ✅ Clear error message if processing unavailable
- ✅ Fallback accepts compliant videos without processing
- ✅ No FFmpeg dependency errors in Vercel logs

---

### Task #2: Thumbnail Extraction
**Priority:** 🟠 HIGH
**Status:** Pending
**Estimated Effort:** 0.5 days

**Problem:**
- `thumbnail_url` field exists but never populated
- No video preview in timeline/cards
- Users can't see what video is without playing it

**Solution:**
- Extract frame at 2-second mark (or first frame)
- Upload thumbnail to Supabase storage
- Display in timeline and schedule views

**Implementation:**
```typescript
// lib/media/video-processor.ts
export async function extractVideoThumbnail(
  videoPath: string
): Promise<Buffer> {
  if (isFFmpegAvailable()) {
    // Extract frame at 2 seconds using FFmpeg
    return extractWithFFmpeg(videoPath, '00:00:02');
  }

  if (process.env.CLOUDINARY_CLOUD_NAME) {
    // Use Cloudinary transformation
    return extractWithCloudinary(videoPath);
  }

  throw new Error('Thumbnail extraction unavailable');
}

// app/api/media/validate-video/route.ts
export async function POST(request: Request) {
  const { videoUrl } = await request.json();

  // Download video
  const videoBuffer = await downloadVideo(videoUrl);

  // Validate
  const validation = await validateVideoForStories(videoBuffer);

  // Extract thumbnail
  const thumbnailBuffer = await extractVideoThumbnail(videoBuffer);

  // Upload thumbnail to Supabase storage
  const { publicUrl: thumbnailUrl } = await uploadToStorage(
    thumbnailBuffer,
    'thumbnails',
    `${generateId()}.jpg`
  );

  return NextResponse.json({
    ...validation,
    thumbnailUrl
  });
}
```

**Files Modified:**
- `lib/media/video-processor.ts` - Add `extractVideoThumbnail()`
- `app/api/media/validate-video/route.ts` - Call thumbnail extraction
- `app/components/schedule/content-card.tsx` - Display thumbnail
- `app/components/mobile/timeline-item.tsx` - Display thumbnail

**Database:**
- Uses existing `thumbnail_url` column in `content_items` table

**Acceptance Criteria:**
- ✅ Thumbnails generated for all uploaded videos
- ✅ `thumbnail_url` populated in database
- ✅ Thumbnails visible in schedule views
- ✅ Fallback to video icon if thumbnail extraction fails

---

### Task #3: Enable Auto-Processing by Default
**Priority:** 🟡 MEDIUM
**Status:** Pending
**Estimated Effort:** 0.25 days

**Problem:**
- `autoProcess={false}` by default
- Users must manually trigger processing
- Unclear if video will work on Instagram

**Solution:**
- Change default to `autoProcess={true}`
- Add admin toggle in settings
- Show processing status clearly

**Implementation:**
```typescript
// app/components/media/video-uploader.tsx
export function VideoUploader({
  autoProcess = true, // Changed from false
  onUploadComplete,
}: VideoUploaderProps) {
  // ... existing code
}

// app/(admin)/settings/page.tsx
<SettingToggle
  label="Auto-process videos"
  description="Automatically process uploaded videos to meet Instagram requirements"
  checked={settings.autoProcessVideos}
  onChange={updateSetting('autoProcessVideos')}
/>
```

**Files Modified:**
- `app/components/media/video-uploader.tsx` - Change default
- `app/(admin)/settings/page.tsx` - Add toggle
- `lib/supabase/system-settings.ts` - Add setting getter/setter

**Database Migration:**
```sql
-- Add auto_process_videos setting
INSERT INTO system_settings (key, value, description)
VALUES (
  'auto_process_videos',
  'true',
  'Automatically process uploaded videos to meet Instagram Stories requirements'
);
```

**Acceptance Criteria:**
- ✅ Videos auto-process by default
- ✅ Admin can disable via settings
- ✅ Processing status shown in UI
- ✅ Clear feedback on applied processing

---

## Phase 2: Short-Term Improvements (UX Enhancements)

### Task #4: Custom VideoPreview Component
**Priority:** 🟡 MEDIUM
**Status:** Pending
**Estimated Effort:** 1 day

**Goal:** Create mobile-optimized video preview component like StoryPreview

**Component Structure:**
```typescript
// app/components/media/video-preview.tsx
interface VideoPreviewProps {
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: { width: number; height: number };
  codec?: string;
  framerate?: number;
  validationStatus?: 'valid' | 'warning' | 'error';
  className?: string;
}

export function VideoPreview({
  videoUrl,
  thumbnailUrl,
  duration,
  resolution,
  validationStatus,
}: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
      {/* Thumbnail overlay */}
      {!isPlaying && thumbnailUrl && (
        <img src={thumbnailUrl} alt="Video thumbnail" />
      )}

      {/* Video player */}
      <video
        src={videoUrl}
        className={cn(!isPlaying && 'hidden')}
        controls
        playsInline
      />

      {/* Duration badge */}
      {duration && (
        <Badge className="absolute top-2 right-2">
          {formatDuration(duration)}
        </Badge>
      )}

      {/* Validation status */}
      {validationStatus && (
        <ValidationBadge status={validationStatus} />
      )}

      {/* Play button overlay */}
      {!isPlaying && (
        <button
          onClick={() => setIsPlaying(true)}
          className="absolute inset-0 flex items-center justify-center"
        >
          <PlayIcon className="w-16 h-16 text-white" />
        </button>
      )}
    </div>
  );
}
```

**Features:**
- Thumbnail with play button overlay
- Duration badge (top-right corner)
- Validation status indicator
- Mobile-optimized controls
- Metadata display (resolution, codec, framerate)

**Files Created:**
- `app/components/media/video-preview.tsx`

**Files Modified:**
- `app/(public)/submit/page.tsx` - Use VideoPreview
- `app/components/schedule/content-card.tsx` - Use VideoPreview
- `app/(mobile)/schedule-mobile/page.tsx` - Use VideoPreview

**Acceptance Criteria:**
- ✅ Works on mobile and desktop
- ✅ Shows thumbnail before playback
- ✅ Displays duration and validation status
- ✅ Custom controls (play/pause, volume, seek)
- ✅ Matches design system (shadcn/ui)

---

### Task #5: Validation UX Improvements
**Priority:** 🟡 MEDIUM
**Status:** Pending
**Estimated Effort:** 1 day

**Goal:** Show requirements upfront and add progress indicators

**Components:**

**1. VideoRequirements Component:**
```typescript
// app/components/media/video-requirements.tsx
export function VideoRequirements() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Instagram Stories Video Requirements</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          <li>✓ Resolution: 1080x1920 (9:16 aspect ratio)</li>
          <li>✓ Format: MP4 with H.264 video, AAC audio</li>
          <li>✓ Duration: Max 60 seconds</li>
          <li>✓ Frame Rate: 30 fps recommended</li>
          <li>✓ Max File Size: 100 MB</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-4">
          Don't worry! We'll automatically convert your video if needed.
        </p>
      </CardContent>
    </Card>
  );
}
```

**2. Progress Indicators:**
```typescript
// app/components/media/video-uploader.tsx
type ProcessingStage = 'uploading' | 'validating' | 'processing' | 'complete';

export function VideoUploader() {
  const [stage, setStage] = useState<ProcessingStage>('uploading');
  const [progress, setProgress] = useState(0);

  return (
    <>
      {/* Progress Stepper */}
      <div className="space-y-2">
        <ProcessingStage
          name="Uploading"
          status={getStageStatus('uploading', stage)}
          progress={stage === 'uploading' ? progress : undefined}
        />
        <ProcessingStage
          name="Validating"
          status={getStageStatus('validating', stage)}
        />
        <ProcessingStage
          name="Processing"
          status={getStageStatus('processing', stage)}
          eta={estimatedTimeRemaining}
        />
      </div>
    </>
  );
}
```

**3. Client-Side Validation:**
```typescript
// app/components/media/video-uploader.tsx
function validateBeforeUpload(file: File): ValidationResult {
  // Check MIME type
  if (!file.type.startsWith('video/')) {
    return { valid: false, error: 'Please select a video file' };
  }

  // Check file size
  if (file.size > 100 * 1024 * 1024) {
    return { valid: false, error: 'Video must be under 100 MB' };
  }

  // Check extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!['mp4', 'mov', 'webm'].includes(ext || '')) {
    return { valid: false, error: 'Supported formats: MP4, MOV, WebM' };
  }

  return { valid: true };
}
```

**Files Created:**
- `app/components/media/video-requirements.tsx`

**Files Modified:**
- `app/components/media/video-uploader.tsx` - Add progress indicators, client-side validation
- `app/(public)/submit/page.tsx` - Show requirements upfront

**Acceptance Criteria:**
- ✅ Requirements visible before upload
- ✅ Client-side validation prevents invalid files
- ✅ Progress shown for each stage
- ✅ ETA shown for processing step
- ✅ Clear error messages with specific guidance

---

### Task #6: Mobile Timeline Enhancements
**Priority:** 🟡 MEDIUM
**Status:** Pending
**Estimated Effort:** 0.5 days

**Goal:** Add video-specific features to mobile timeline

**Features:**

**1. Video Duration Badge:**
```typescript
// app/components/mobile/timeline-item.tsx
{mediaType === 'VIDEO' && duration && (
  <Badge variant="secondary" className="absolute top-2 right-2">
    <Clock className="w-3 h-3 mr-1" />
    {formatDuration(duration)}
  </Badge>
)}
```

**2. Video Thumbnail:**
```typescript
// app/components/mobile/timeline-item.tsx
<div className="relative aspect-[9/16] bg-muted rounded-lg overflow-hidden">
  {thumbnailUrl ? (
    <img
      src={thumbnailUrl}
      alt="Video thumbnail"
      className="w-full h-full object-cover"
    />
  ) : (
    <VideoIcon className="w-12 h-12 text-muted-foreground" />
  )}

  {/* Play button overlay */}
  <div className="absolute inset-0 flex items-center justify-center">
    <PlayIcon className="w-8 h-8 text-white" />
  </div>
</div>
```

**3. Processing Status Indicator:**
```typescript
// app/components/mobile/timeline-item.tsx
{processingStatus && (
  <StatusBadge status={processingStatus}>
    {processingStatus === 'processing' && 'Processing...'}
    {processingStatus === 'queued' && 'Queued'}
    {processingStatus === 'ready' && 'Ready to publish'}
  </StatusBadge>
)}
```

**4. Media Type Filter:**
```typescript
// app/components/mobile/filter-bar.tsx
<Select value={mediaType} onValueChange={setMediaType}>
  <SelectTrigger>
    <SelectValue placeholder="All media" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All media</SelectItem>
    <SelectItem value="IMAGE">Images only</SelectItem>
    <SelectItem value="VIDEO">Videos only</SelectItem>
  </SelectContent>
</Select>
```

**Files Modified:**
- `app/(mobile)/schedule-mobile/page.tsx` - Add media type filter
- `app/components/mobile/timeline-item.tsx` - Show video features
- `app/components/mobile/filter-bar.tsx` - Add filter dropdown

**Acceptance Criteria:**
- ✅ Video duration badge visible
- ✅ Thumbnails displayed for videos
- ✅ Processing status indicators clear
- ✅ Can filter by media type
- ✅ Video metadata visible (resolution shown on tap)

---

## Phase 3: Long-Term Enhancements (Future)

These items are documented for future consideration but not prioritized for immediate implementation:

### 7. Advanced Video Editor
- Trim video to specific duration
- Add text overlays
- Select custom thumbnail frame
- Adjust aspect ratio visually
- Filters and effects

### 8. Batch Video Upload
- Upload multiple videos at once
- Bulk scheduling interface
- Queue management with drag-and-drop reordering

### 9. Analytics Integration
- Instagram Insights for video Stories
- View count, reach, engagement metrics
- Completion rate tracking
- Best performing times analysis

---

## Technical Architecture

### Video Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. VIDEO UPLOAD                                             │
│    User selects/drops video → Upload to Supabase Storage   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. VALIDATION                                               │
│    POST /api/media/validate-video                           │
│    → validateVideoForStories()                              │
│    → Extract metadata (resolution, codec, duration, etc.)   │
│    → Extract thumbnail (2-second mark)                      │
│    → Upload thumbnail to storage                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. PROCESSING (if needed)                                   │
│    If needsProcessing = true:                               │
│      → Check FFmpeg (local dev)                             │
│      → Use Cloudinary (production)                          │
│      → Convert to H.264/AAC, 1080x1920, 30fps              │
│      → Upload processed video                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SUBMISSION                                               │
│    POST /api/content                                        │
│    → Insert into content_items                              │
│    → submission_status = 'pending'                          │
│    → Store metadata (duration, codec, thumbnail_url)        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. ADMIN APPROVAL & SCHEDULING                              │
│    Admin reviews → Approves → Sets scheduled_time           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. CRON PROCESSING                                          │
│    /api/cron/process runs                                   │
│    → Fetch scheduled items (scheduled_time <= NOW)          │
│    → Re-process if needs_processing = true                  │
│    → Duplicate detection                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. INSTAGRAM PUBLISHING                                     │
│    → Create container (POST /v24.0/{igUserId}/media)        │
│    → Poll status (wait for FINISHED)                        │
│    → Publish (POST /v24.0/{igUserId}/media_publish)         │
│    → Update database (publishing_status = 'published')      │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema Changes

### Existing Schema (No changes required)

All necessary columns already exist in `content_items` table:

```sql
-- Video-specific columns (already exist)
media_type              text                    -- 'IMAGE' | 'VIDEO'
media_url               text                    -- Video URL
thumbnail_url           text                    -- Thumbnail URL (to be populated)
video_duration          integer                 -- Duration in seconds
video_codec             text                    -- e.g., 'h264'
video_framerate         numeric(5,2)            -- e.g., 30.0
needs_processing        boolean                 -- Processing flag
dimensions              jsonb                   -- {width, height}
```

### System Settings Addition

```sql
-- Add auto_process_videos setting (Task #3)
INSERT INTO system_settings (key, value, description)
VALUES (
  'auto_process_videos',
  'true',
  'Automatically process uploaded videos to meet Instagram Stories requirements'
);
```

---

## Environment Variables

### Required for Production

```bash
# Cloudinary (for video processing in Vercel)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Existing (no changes)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Dependencies

### New Packages Required

```json
{
  "dependencies": {
    "cloudinary": "^2.0.0"
  }
}
```

### Existing Packages (no changes)
- `fluent-ffmpeg` - Local video processing
- `@supabase/supabase-js` - Storage and database

---

## Testing Strategy

### Unit Tests (Vitest + MSW)

```typescript
// lib/media/video-processor.test.ts
describe('processVideoForStory', () => {
  it('uses FFmpeg in local environment', async () => {
    // Mock FFmpeg availability
    // Test processing with FFmpeg
  });

  it('uses Cloudinary in production', async () => {
    // Mock Cloudinary API
    // Test processing with Cloudinary
  });

  it('accepts compliant videos without processing', async () => {
    // Mock compliant video
    // Test skips processing
  });

  it('throws error when processing unavailable', async () => {
    // Mock no FFmpeg, no Cloudinary
    // Expect error
  });
});

// lib/media/video-processor.test.ts
describe('extractVideoThumbnail', () => {
  it('extracts thumbnail at 2-second mark', async () => {
    // Test thumbnail extraction
  });

  it('falls back to first frame if video < 2 seconds', async () => {
    // Test short video
  });

  it('uses Cloudinary transformation in production', async () => {
    // Mock Cloudinary thumbnail
  });
});
```

### Integration Tests (Vitest + Supabase)

```typescript
// app/api/media/validate-video/route.test.ts
describe('POST /api/media/validate-video', () => {
  it('validates and extracts thumbnail', async () => {
    // Upload video
    // Call validation endpoint
    // Expect validation results + thumbnail URL
  });

  it('populates thumbnail_url in database', async () => {
    // Submit video
    // Check content_items.thumbnail_url is set
  });
});
```

### E2E Tests (Playwright - REAL Instagram API)

```typescript
// tests/e2e/video-submission.spec.ts
test('submit video and publish to Instagram', async ({ page }) => {
  // Login
  await page.goto('/submit');

  // Upload video
  await page.setInputFiles('input[type="file"]', 'test-video.mp4');

  // Wait for validation
  await expect(page.locator('[data-testid="validation-status"]'))
    .toContainText('Video is ready');

  // See thumbnail
  await expect(page.locator('[data-testid="video-thumbnail"]'))
    .toBeVisible();

  // Submit
  await page.click('button:has-text("Submit for Review")');

  // Admin approves and schedules
  await approveAndSchedule(page);

  // Trigger cron
  await triggerCron();

  // Verify published on Instagram (REAL API)
  const mediaId = await getPublishedMediaId();
  expect(mediaId).toBeTruthy();
});
```

---

## Rollout Plan

### Step 1: Setup (Week 1)
- Create Cloudinary account and get API credentials
- Add environment variables to Vercel
- Install `cloudinary` npm package
- Run database migration for `auto_process_videos` setting

### Step 2: Core Implementation (Week 1-2)
- **Day 1-2:** Task #1 - Cloudinary integration
- **Day 2-3:** Task #2 - Thumbnail extraction
- **Day 3:** Task #3 - Enable auto-processing
- **Day 4-5:** Testing and bug fixes

### Step 3: UX Improvements (Week 2-3)
- **Day 6-7:** Task #4 - VideoPreview component
- **Day 8-9:** Task #5 - Validation UX
- **Day 9-10:** Task #6 - Mobile timeline enhancements

### Step 4: QA & Deployment (Week 3)
- Full E2E testing with real Instagram account
- Security audit (ensure Cloudinary secrets not leaked)
- Performance testing (video processing times)
- Deploy to production

---

## Success Metrics

### Technical Metrics
- ✅ Video processing success rate > 95%
- ✅ Thumbnail generation success rate > 99%
- ✅ Zero FFmpeg errors in production logs
- ✅ Processing time < 30 seconds per video

### UX Metrics
- ✅ Time to upload and validate video < 10 seconds
- ✅ Users see validation results immediately
- ✅ Thumbnails visible in all video previews
- ✅ Mobile timeline shows video metadata

### Business Metrics
- ✅ Video submission rate increases by 20%
- ✅ Video publish success rate > 98%
- ✅ User satisfaction with video UX

---

## Risk Assessment

### High Risk: Cloudinary Integration
**Risk:** Cloudinary API failures or rate limits
**Mitigation:**
- Implement robust error handling and retries
- Add fallback to accept compliant videos as-is
- Monitor Cloudinary API usage and costs
- Set up alerts for processing failures

### Medium Risk: Thumbnail Extraction
**Risk:** Thumbnail extraction fails for some video codecs
**Mitigation:**
- Use Cloudinary's robust thumbnail generation
- Fallback to video icon if extraction fails
- Test with various video formats

### Low Risk: Auto-Processing Default
**Risk:** Users might not want auto-processing
**Mitigation:**
- Add admin toggle to disable
- Show clear feedback on what processing was applied
- Allow users to bypass if needed

---

## Support & Documentation

### User-Facing Documentation
- Update submit page with video requirements
- Create help article on video formats
- Document troubleshooting steps for failed uploads

### Developer Documentation
- Document Cloudinary setup process
- Add comments to video processing code
- Update README with new environment variables
- Document thumbnail extraction flow

---

## Team Assignments

| Task | Owner | Status | Branch |
|------|-------|--------|--------|
| #1 Cloudinary Integration | TBD | Pending | `feature/cloudinary-video-processing` |
| #2 Thumbnail Extraction | TBD | Pending | `feature/video-thumbnails` |
| #3 Auto-Processing | TBD | Pending | `feature/auto-process-videos` |
| #4 VideoPreview Component | TBD | Pending | `feature/video-preview-component` |
| #5 Validation UX | TBD | Pending | `feature/video-validation-ux` |
| #6 Mobile Timeline | TBD | Pending | `feature/mobile-timeline-videos` |

---

## Changelog

**2026-02-16:**
- Initial plan created
- Team "video-journey-implementation" created
- 6 tasks created and assigned

---

## References

**Meta Graph API Documentation:**
- [Instagram Graph API Complete Guide 2026](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/)
- [Instagram Stories API Publishing Guide](https://www.ayrshare.com/instagram-stories-api-how-to-post-a-story/)

**Implementation Files:**
- `lib/media/video-processor.ts` - Video processing logic
- `app/components/media/video-uploader.tsx` - Upload UI
- `lib/instagram/publish.ts` - Publishing flow
- `lib/scheduler/process-service.ts` - Cron processing

**Linear Project:**
- [Instagram Stories Webhook](https://linear.app/bms95/project/instagram-stories-webhook-ea21e56e20bf)
