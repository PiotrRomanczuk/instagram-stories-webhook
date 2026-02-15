---
name: media-pipeline-specialist
description: "Manages the media processing pipeline: image/video validation, story processing, FFmpeg workflows, storage uploads, health checks, and perceptual hashing."
tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
---

# Media Pipeline Specialist Agent

## Architecture Overview

The media pipeline handles validation, processing, and storage for Instagram Stories content.

### Key Files

| File | Purpose |
|------|---------|
| `lib/media/validator.ts` | Client-side image dimension/ratio validation |
| `lib/media/server-validator.ts` | Server-side media validation |
| `lib/media/processor.ts` | General media processing orchestration |
| `lib/media/story-processor.ts` | Image processing for Stories (resize, pad) |
| `lib/media/video-processor.ts` | Video processing via FFmpeg |
| `lib/media/health-check.ts` | Media URL accessibility checks |
| `lib/media/phash.ts` | Perceptual hashing for duplicate detection |
| `lib/media/index.ts` | Barrel exports |
| `lib/storage/cleanup.ts` | Storage cleanup for processed media |

---

## Instagram Stories Media Requirements

### Images

| Constraint | Value |
|-----------|-------|
| Ideal resolution | 1080x1920 (9:16) |
| Minimum dimension | 320px |
| Maximum width | 1440px (Instagram resizes beyond) |
| Formats | JPEG, PNG |
| Aspect ratio tolerance | 5% from 9:16 |

### Videos

| Constraint | Value |
|-----------|-------|
| Resolution | 1080x1920 (9:16) |
| Codec | H.264 video, AAC audio |
| Format | MP4 |
| Frame rate | 30 fps (23-60 acceptable) |
| Video bitrate | ~3,500 kbps |
| Audio bitrate | 128 kbps |
| Max duration | 60 seconds (Instagram splits into 15s segments) |
| Max file size | 100 MB recommended |
| Minimum dimension | 320px |
| Minimum duration | 1 second |

---

## Image Processing Flow

```
Upload -> getImageDimensionsFromFile()
  -> analyzeAspectRatio()
    -> perfect (9:16) -> no processing needed
    -> acceptable (<5% off) -> minor crop warning
    -> needs_padding (too wide) -> add vertical padding
    -> needs_crop (too tall) -> crop to fit
  -> validateForStories() -> errors/warnings
  -> processAndUploadStoryImage() -> Supabase Storage -> public URL
```

### Aspect Ratio Analysis

The `analyzeAspectRatio()` function returns:

```typescript
interface AspectRatioInfo {
  ratio: number;          // Actual width/height ratio
  isIdeal: boolean;       // Within 0.01 of 9:16
  isAcceptable: boolean;  // Within 5% of 9:16
  needsProcessing: boolean;
  recommendation: 'perfect' | 'acceptable' | 'needs_padding' | 'needs_crop';
  message: string;        // Human-readable explanation
}
```

---

## Video Processing Flow

```
Upload -> validateVideoForStories(buffer)
  -> getVideoMetadata() via FFprobe
  -> Check: resolution, duration, codec, frame rate, file size, audio
  -> needsProcessing? -> processVideoForStory(buffer, options)
    -> buildFfmpegArgs() (scale, pad, re-encode)
    -> runFfmpeg()
    -> Upload to Supabase Storage
  -> Return public URL
```

### FFmpeg Limitation

FFmpeg is **NOT available in Vercel serverless functions**. The video processor:
1. Checks `checkFfmpegAvailable()` at runtime
2. Returns original URL if FFmpeg unavailable (graceful fallback)
3. Logs a warning for visibility

For production video processing, an external service or custom Docker deployment is needed.

### Video Processing Options

```typescript
interface VideoProcessingOptions {
  maxDuration?: number;       // Default: 60s
  videoBitrate?: string;      // Default: '3500k'
  audioBitrate?: string;      // Default: '128k'
  frameRate?: number;         // Default: 30
  backgroundColor?: string;   // Default: '#000000'
  blurBackground?: boolean;   // Default: false
  preset?: string;            // Default: 'medium'
}
```

### FFmpeg Processing Steps

1. **Aspect ratio**: Letterbox (wider) or pillarbox (taller) with black padding
2. **Resolution**: Scale to 1080x1920
3. **Frame rate**: Adjust if outside 23-60fps range
4. **Video codec**: H.264 high profile, level 4.0
5. **Duration**: Trim to max duration
6. **Audio**: Convert to AAC stereo 44.1kHz (or add silent track if no audio)
7. **Container**: MP4 with faststart flag

---

## Media Health Checks

The health check system (`lib/media/health-check.ts`) validates media URL accessibility:

```typescript
checkMediaHealth(url) -> { healthy, statusCode, error, checkedAt }
batchCheckMediaHealth(urls) -> Map<url, result>
```

- Uses HEAD requests for efficiency (no download)
- 5-second timeout per request
- Called by `/api/cron/check-media-health` every 6 hours
- Identifies broken/expired media URLs in the content queue

---

## Perceptual Hashing

`lib/media/phash.ts` provides perceptual hashing for near-duplicate detection:
- Generates a hash from image visual content (not file bytes)
- Used by `generateContentHash()` in the publishing flow
- Prevents re-publishing visually identical content within 24 hours

---

## Storage Integration

Media is stored in Supabase Storage:

| Bucket | Purpose |
|--------|---------|
| `stories` | Processed story images/videos |
| `stories/processed-stories/` | FFmpeg-processed video output |

### Upload Pattern

```typescript
const { error } = await supabaseAdmin.storage
  .from('stories')
  .upload(storagePath, buffer, {
    contentType: 'video/mp4',
    upsert: true,
  });

const { data: urlData } = supabaseAdmin.storage
  .from('stories')
  .getPublicUrl(storagePath);
```

### Cleanup

`lib/storage/cleanup.ts` handles removing processed media after publishing or on failure.

---

## Adding New Media Formats

### Step 1: Update Validation

Add format-specific validation in `lib/media/validator.ts` or create a new validator:

```typescript
export function validateForReels(dimensions: MediaDimensions) {
  // Reels have different requirements than Stories
}
```

### Step 2: Update Processing

Add processing logic in `lib/media/processor.ts` or create a format-specific processor.

### Step 3: Update Types

Add new types to `lib/types/` for the new format's metadata and validation results.

---

## Debugging Media Issues

### Image Won't Publish

1. Check dimensions: Is it at least 320px?
2. Check format: Is it JPEG or PNG?
3. Check URL accessibility: `curl -I <media_url>` - is it publicly accessible?
4. Check aspect ratio: Use `analyzeAspectRatio()` to see recommendation

### Video Processing Fails

1. Is FFmpeg available? Check `checkFfmpegAvailable()`
2. Check video metadata: Run `ffprobe -v quiet -print_format json -show_format -show_streams <file>`
3. Check file size: Over 100MB?
4. Check duration: Over 60 seconds?
5. Check codec: Is input codec supported by FFmpeg?

### Media Health Check Failures

1. Is the URL expired? Supabase signed URLs have expiry
2. Is the storage bucket public?
3. Network issues? Check with manual `curl -I <url>`

### Content Hash Duplicate Rejection

If publishing is rejected due to duplicate detection:
1. Check `content_hash` column in `content_items` table
2. Check 24-hour window in `checkForRecentPublish()`
3. Use `bypassDuplicateCheck: true` in force-process to override
