# AI Analysis Storage Setup Guide

This guide explains how to configure and use the AI Analysis storage feature for analyzing published memes. This feature requires Supabase Pro plan.

## Overview

The AI Analysis system automatically saves all published memes to a private Supabase storage bucket (`ai-analysis`) for analysis. Each saved meme is tracked in the database with metadata for later AI processing.

### Features
- ✅ Automatic archival of published memes to private storage
- ✅ Metadata tracking (file size, type, publish date)
- ✅ Signed URL generation for external AI services
- ✅ Analysis status tracking (pending → processed → archived)
- ✅ JSON storage for AI analysis results
- ✅ Admin-only access controls

## Setup Steps

### 1. Run the Migration

The AI analysis system requires database schema and storage bucket setup. Run this migration in your Supabase console:

```sql
-- File: supabase/migrations/20260126180000_ai_analysis_storage.sql
-- Run this in Supabase SQL Editor
```

Or use Supabase CLI:

```bash
supabase migration up
```

This creates:
- `ai-analysis` storage bucket (private)
- `ai_meme_analysis` table with metadata
- RLS policies for admin-only access

### 2. Initialize Storage Bucket

After running the migration, the bucket will be created automatically in Supabase. Verify it exists:

1. Go to Supabase Dashboard → Storage
2. Look for `ai-analysis` bucket
3. Confirm it's **private** (not public)

### 3. Configuration

No additional configuration needed! The system automatically:
- Creates the bucket on migration
- Saves memes when they're published
- Tracks metadata in the database
- Provides signed URLs for access

## How It Works

### Automatic Archival

When a meme is published to Instagram:

1. **Publishing**: Post is sent to Instagram via API
2. **Storage**: Published meme is downloaded and saved to `ai-analysis` bucket
3. **Tracking**: Database record created with metadata
4. **Status**: Marked as `pending` for analysis

```
Published → Downloaded → Stored → Tracked → Ready for AI Analysis
```

### File Organization

Memes are organized by publish date:

```
ai-analysis/
├── 2026/
│   ├── 01/
│   │   ├── ig_12345_meme1.jpg
│   │   ├── ig_12346_meme2.mp4
│   │   └── ...
│   └── 02/
└── ...
```

**Path format**: `{year}/{month}/{ig_media_id}_{filename}`

### Database Tracking

Each saved meme has a record in `ai_meme_analysis`:

```typescript
{
  id: "uuid",                          // Analysis record ID
  meme_id: "uuid",                     // Scheduled post ID
  ig_media_id: "text",                 // Instagram media ID
  storage_path: "2026/01/...",         // Storage path
  analysis_status: "pending",          // pending|processed|failed|archived
  file_type: "image",                  // image|video
  file_size_bytes: 1024000,            // File size
  analysis_data: {...},                // AI results (JSON)
  created_at: "2026-01-26T...",        // Published date
  processed_at: null,                  // When analysis completed
  archived_at: null                    // When archived
}
```

## API Endpoints

### GET /api/ai-analysis

List pending memes for analysis:

```bash
curl -X GET "http://localhost:3000/api/ai-analysis?status=pending&limit=50" \
  -H "Authorization: Bearer YOUR_SESSION"
```

**Response:**
```json
{
  "status": "success",
  "count": 5,
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

### POST /api/ai-analysis/results

Submit analysis results for a meme:

```bash
curl -X POST "http://localhost:3000/api/ai-analysis/results" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION" \
  -d '{
    "analysisId": "uuid",
    "analysisData": {
      "engagement_score": 8.5,
      "predicted_likes": 1500,
      "sentiment": "positive",
      "topics": ["humor", "trending"],
      "optimal_post_time": "2026-01-27T18:00:00Z"
    }
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "Analysis results recorded",
  "analysisId": "uuid"
}
```

### POST /api/ai-analysis/signed-url

Generate signed download URL for external AI services:

```bash
curl -X POST "http://localhost:3000/api/ai-analysis/signed-url" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION" \
  -d '{
    "storagePath": "2026/01/123456789_meme.jpg",
    "expiresIn": 3600
  }'
```

**Response:**
```json
{
  "status": "success",
  "signedUrl": "https://...",
  "expiresIn": 3600,
  "expiresAt": "2026-01-26T12:30:00Z"
}
```

## Usage Examples

### List Pending Memes for Analysis

```typescript
// In your AI analysis service
const response = await fetch('/api/ai-analysis?status=pending&limit=50');
const { memes } = await response.json();

for (const meme of memes) {
  // Get signed URL for download
  const urlRes = await fetch('/api/ai-analysis/signed-url', {
    method: 'POST',
    body: JSON.stringify({
      storagePath: meme.storagePath,
      expiresIn: 3600
    })
  });

  const { signedUrl } = await urlRes.json();

  // Download and analyze with your AI service
  const mediaData = await fetch(signedUrl);
  // ... perform AI analysis ...

  // Submit results
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
}
```

### Integration with External AI Service

```typescript
// Example: Sending to a Vision AI API
const { Anthropic } = require('@anthropic-ai/sdk');

const client = new Anthropic();

async function analyzeWithClaude(signedUrl) {
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: signedUrl
            }
          },
          {
            type: 'text',
            text: 'Analyze this meme and provide: engagement potential (1-10), predicted sentiment, key topics, and best posting time.'
          }
        ]
      }
    ]
  });

  return response.content[0].text;
}
```

## Security

### Access Control

- **Private Bucket**: `ai-analysis` bucket is private
- **Admin-Only**: Only admin/developer users can access via API
- **Signed URLs**: Temporary download URLs (default 1 hour expiry)
- **RLS Policies**: Database policies enforce admin-only access

### Storage Structure

```
Bucket: ai-analysis (Private)
├── Users: service_role (backend)
├── URLs: Signed URLs with time limit
└── Access: No public URLs
```

## Database Maintenance

### Archive Old Analysis

Archive analysis records older than 90 days:

```typescript
import { archiveOldAnalysis } from '@/lib/ai-analysis/meme-archiver';

// Archive records older than 90 days
const archived = await archiveOldAnalysis(90);
console.log(`Archived ${archived} records`);
```

### View Analysis Status

```sql
-- Check pending analysis
SELECT
  COUNT(*) as pending,
  SUM(file_size_bytes) as total_bytes
FROM public.ai_meme_analysis
WHERE analysis_status = 'pending';

-- Check processed analysis
SELECT
  COUNT(*) as processed,
  AVG((analysis_data->>'engagement_score')::float) as avg_engagement
FROM public.ai_meme_analysis
WHERE analysis_status = 'processed';

-- Check storage usage
SELECT
  SUM(file_size_bytes) / 1024 / 1024 as total_mb,
  COUNT(*) as total_files
FROM public.ai_meme_analysis
WHERE analysis_status NOT IN ('archived');
```

## Monitoring

### Logs

All AI analysis operations are logged with the module `ai-analysis:meme-archiver`. Check logs for:

```
✅ Meme archived for analysis
⚠️ Failed to save to AI analysis bucket
📊 Analysis results updated
```

### Metrics

Track in your dashboard:

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as published_memes,
  SUM(file_size_bytes) / 1024 / 1024 as storage_mb,
  COUNT(CASE WHEN analysis_status = 'processed' THEN 1 END) as analyzed
FROM public.ai_meme_analysis
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Troubleshooting

### Meme Not Being Archived

1. **Check logs** for errors during publishing
2. **Verify bucket** exists in Supabase
3. **Check RLS** policies are correct
4. **Test endpoint** manually: `GET /api/ai-analysis`

### Signed URL Expired

URLs expire after specified time (default 1 hour). Generate new URL:

```typescript
const signedUrl = await getSignedAnalysisUrl(storagePath, 3600);
```

### Storage Full

If hitting storage limits:

1. Archive old records: `await archiveOldAnalysis(30)` (30 days)
2. Delete archived files from bucket
3. Upgrade storage plan if needed

### Access Denied

- Verify user is admin/developer
- Check RLS policies in database
- Ensure bucket is created (run migration)

## Pro Plan Features Used

✅ **Increased Storage**: Up to 500GB (vs 1GB free)
✅ **Private Buckets**: Multiple private storage buckets
✅ **Custom RLS**: Advanced Row Level Security policies
✅ **Better Quotas**: Higher API rate limits for processing

## Pricing Considerations

**Costs (Supabase Pro at $25/month)**:
- Storage: $1 per GB over 500GB
- Bandwidth: $10 per GB over 100GB/month
- Database: Included up to 8GB

**Optimize**:
1. Archive old analysis after 90 days
2. Set appropriate expiry on signed URLs
3. Monitor storage usage monthly

## Next Steps

1. ✅ Run migration
2. ✅ Verify bucket created
3. ✅ Publish a test meme
4. ✅ Check API returns pending meme
5. ✅ Submit analysis results
6. ✅ Monitor storage usage

## Support

For issues:
- Check `CLAUDE.md` for development patterns
- Review error logs in `/debug` endpoint
- Check Supabase dashboard for storage/RLS issues
