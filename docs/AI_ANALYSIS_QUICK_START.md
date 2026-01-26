# AI Analysis - Quick Start Guide

Get your Supabase Pro plan AI analysis system running in 5 minutes.

## Prerequisites

✅ Supabase Pro plan (upgraded)
✅ Supabase project with meme publishing setup
✅ Node.js installed locally

## 1. Run the Migration

In your Supabase dashboard:

**Option A: Via Dashboard**
1. Go to Supabase → SQL Editor
2. Create new query
3. Paste migration from: `supabase/migrations/20260126180000_ai_analysis_storage.sql`
4. Click "Run"

**Option B: Via CLI**
```bash
supabase migration up
```

This creates:
- `ai-analysis` private storage bucket
- `ai_meme_analysis` table for tracking
- RLS policies for admin-only access

## 2. Initialize Storage (Optional)

Verify and initialize storage:

```bash
npx tsx scripts/setup-ai-analysis.ts
```

Output:
```
✅ AI Analysis Storage Setup Complete!

📋 Next steps:
   1. Run the migration ✓
   2. Check docs: docs/AI_ANALYSIS_SETUP.md
   3. Publish a test meme
   4. Check pending memes: GET /api/ai-analysis
```

## 3. Test It

### Publish a Test Meme

1. Go to `/schedule`
2. Schedule a test post
3. Wait for cron or click "Post Now"
4. Check logs for: `✅ Meme archived for analysis`

### Check Pending Memes

```bash
curl "http://localhost:3000/api/ai-analysis" \
  -H "Cookie: your_auth_cookie"
```

Response:
```json
{
  "status": "success",
  "count": 1,
  "memes": [
    {
      "id": "uuid",
      "memeId": "uuid",
      "igMediaId": "123456789",
      "storagePath": "2026/01/123456789_meme.jpg",
      "status": "pending",
      "fileType": "image",
      "fileSizeBytes": 2048000,
      "createdAt": "2026-01-26T10:30:00Z"
    }
  ]
}
```

### Get Download URL

For external AI services:

```bash
curl -X POST "http://localhost:3000/api/ai-analysis/signed-url" \
  -H "Content-Type: application/json" \
  -H "Cookie: your_auth_cookie" \
  -d '{
    "storagePath": "2026/01/123456789_meme.jpg",
    "expiresIn": 3600
  }'
```

Response:
```json
{
  "status": "success",
  "signedUrl": "https://...",
  "expiresIn": 3600,
  "expiresAt": "2026-01-26T12:30:00Z"
}
```

### Submit Analysis Results

```bash
curl -X POST "http://localhost:3000/api/ai-analysis/results" \
  -H "Content-Type: application/json" \
  -H "Cookie: your_auth_cookie" \
  -d '{
    "analysisId": "uuid_from_pending_list",
    "analysisData": {
      "engagement_score": 8.5,
      "predicted_likes": 1500,
      "sentiment": "positive",
      "topics": ["humor", "trending"]
    }
  }'
```

Response:
```json
{
  "status": "success",
  "message": "Analysis results recorded",
  "analysisId": "uuid"
}
```

## Storage Structure

Memes are organized by publish date:

```
ai-analysis/
├── 2026/
│   ├── 01/
│   │   ├── ig_123456_meme1.jpg
│   │   ├── ig_123457_meme2.mp4
│   │   └── ig_123458_meme3.jpg
│   └── 02/
│       └── ...
└── ...
```

**Format**: `{year}/{month}/{ig_media_id}_{filename}`

## Workflow

```
Published ──────┬──────→ Downloaded ──→ Stored ──→ Tracked
                │
            Auto-saved
            to AI bucket        (Pending Analysis)
                │
                └───────────→ AI Analysis Service
                                  │
                                  ↓
                          Submit Results ──→ Status: Processed
```

## Database Query Examples

### View Pending Memes

```sql
SELECT * FROM ai_meme_analysis
WHERE analysis_status = 'pending'
ORDER BY created_at DESC;
```

### View Processed Memes

```sql
SELECT
  meme_id,
  ig_media_id,
  analysis_data,
  processed_at
FROM ai_meme_analysis
WHERE analysis_status = 'processed'
ORDER BY processed_at DESC;
```

### Check Storage Usage

```sql
SELECT
  SUM(file_size_bytes) / 1024 / 1024 as total_mb,
  COUNT(*) as total_files,
  COUNT(CASE WHEN analysis_status = 'pending' THEN 1 END) as pending
FROM ai_meme_analysis;
```

## Common Tasks

### Download a Meme for Analysis

```typescript
// Get pending meme
const res = await fetch('/api/ai-analysis');
const { memes } = await res.json();
const meme = memes[0];

// Get signed URL
const urlRes = await fetch('/api/ai-analysis/signed-url', {
  method: 'POST',
  body: JSON.stringify({
    storagePath: meme.storagePath,
    expiresIn: 3600
  })
});
const { signedUrl } = await urlRes.json();

// Download
const response = await fetch(signedUrl);
const blob = await response.blob();
```

### Submit Analysis Results

```typescript
// After analyzing...
await fetch('/api/ai-analysis/results', {
  method: 'POST',
  body: JSON.stringify({
    analysisId: meme.id,
    analysisData: {
      engagement_score: 8.5,
      predicted_likes: 1500,
      sentiment: 'positive',
      topics: ['humor', 'trending']
    }
  })
});
```

### Archive Old Analysis (Cleanup)

```typescript
import { archiveOldAnalysis } from '@/lib/ai-analysis/meme-archiver';

// Archive records older than 90 days
const archived = await archiveOldAnalysis(90);
console.log(`Archived ${archived} records`);
```

## Logs

Check the logs for AI analysis operations:

**Look for**:
- `✅ Meme archived for analysis` - Success
- `⚠️ Failed to save to AI analysis bucket` - Error
- `📊 Saved to AI analysis bucket` - Archived
- `✅ Analysis results updated` - Results received

In development:
```bash
npm run dev
# Look for [ai-analysis:meme-archiver] log entries
```

## Troubleshooting

### Memes Not Archived?

1. Check migration ran successfully
2. Check bucket exists: Supabase → Storage → `ai-analysis`
3. Check logs for errors
4. Test endpoint: `GET /api/ai-analysis`

### Can't Get Signed URL?

- User must be admin/developer
- Meme must exist in database
- URL expires after specified time (default 1 hour)

### Storage Full?

Archive old records:
```sql
UPDATE ai_meme_analysis
SET analysis_status = 'archived', archived_at = NOW()
WHERE created_at < NOW() - INTERVAL '90 days'
  AND analysis_status = 'processed';
```

Then delete archived files from bucket.

## Full Documentation

See `docs/AI_ANALYSIS_SETUP.md` for:
- Detailed API reference
- Integration examples
- Security configuration
- Monitoring and maintenance
- Pricing optimization

## Next Steps

1. ✅ Run migration
2. ✅ Publish test meme
3. ✅ Verify pending meme appears
4. ✅ Get signed URL
5. 🎯 **Integrate AI Service**
   - Use signed URLs to download memes
   - Analyze (vision API, custom model, etc.)
   - Submit results back via API
6. 🎯 **Monitor & Maintain**
   - Check pending count daily
   - Archive old records monthly
   - Monitor storage usage

## Support

- Full docs: `docs/AI_ANALYSIS_SETUP.md`
- Architecture: `CLAUDE.md` → "AI Analysis Storage"
- Source: `lib/ai-analysis/meme-archiver.ts`
- API: `app/api/ai-analysis/*`
- Migration: `supabase/migrations/20260126180000_*`
