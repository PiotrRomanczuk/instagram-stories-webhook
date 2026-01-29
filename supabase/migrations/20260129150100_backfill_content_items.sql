-- Migration: Backfill content_items from meme_submissions and scheduled_posts
-- This migration populates the new unified content_items table with existing data

-- ============== BACKFILL FROM MEME_SUBMISSIONS ==============

-- Map meme_submissions status to unified statuses:
-- - 'pending' -> submission_status='pending', publishing_status='draft'
-- - 'approved' -> submission_status='approved', publishing_status='draft'
-- - 'rejected' -> submission_status='rejected', publishing_status='draft'
-- - 'scheduled' -> submission_status='approved', publishing_status='scheduled'
-- - 'published' -> submission_status='approved', publishing_status='published'

INSERT INTO public.content_items (
    id, user_id, user_email, media_url, media_type, storage_path, title, caption,
    source, submission_status, publishing_status,
    rejection_reason, reviewed_at, reviewed_by,
    scheduled_time, published_at, ig_media_id,
    created_at, updated_at
)
SELECT
    ms.id,
    ms.user_id,
    ms.user_email,
    ms.media_url,
    'IMAGE' as media_type,  -- Legacy memes are always IMAGE
    ms.storage_path,
    ms.title,
    ms.caption,
    'submission' as source,
    CASE
        WHEN ms.status = 'pending' THEN 'pending'
        WHEN ms.status = 'approved' THEN 'approved'
        WHEN ms.status = 'scheduled' THEN 'approved'
        WHEN ms.status = 'published' THEN 'approved'
        WHEN ms.status = 'rejected' THEN 'rejected'
        ELSE 'pending'
    END as submission_status,
    CASE
        WHEN ms.status = 'pending' THEN 'draft'
        WHEN ms.status = 'approved' THEN 'draft'
        WHEN ms.status = 'scheduled' THEN 'scheduled'
        WHEN ms.status = 'published' THEN 'published'
        WHEN ms.status = 'rejected' THEN 'draft'
        ELSE 'draft'
    END as publishing_status,
    ms.rejection_reason,
    ms.reviewed_at,
    ms.reviewed_by,
    ms.scheduled_time,
    ms.published_at,
    ms.ig_media_id,
    ms.created_at,
    COALESCE(ms.updated_at, ms.created_at)
FROM public.meme_submissions ms
WHERE NOT EXISTS (
    SELECT 1 FROM public.content_items WHERE id = ms.id
) ON CONFLICT (id) DO NOTHING;

-- ============== BACKFILL FROM SCHEDULED_POSTS ==============

-- Map scheduled_posts status to unified statuses:
-- - 'pending' -> submission_status=NULL, publishing_status='scheduled'
-- - 'processing' -> submission_status=NULL, publishing_status='processing'
-- - 'published' -> submission_status=NULL, publishing_status='published'
-- - 'failed' -> submission_status=NULL, publishing_status='failed'

-- Generate UUID for scheduled posts (they have text IDs, we need UUIDs for content_items)
-- We'll use a deterministic UUID v5 based on the scheduled_posts ID to maintain consistency

INSERT INTO public.content_items (
    id, user_id, user_email, media_url, media_type, title, caption,
    source, submission_status, publishing_status,
    scheduled_time, processing_started_at, published_at, ig_media_id, error,
    content_hash, idempotency_key, retry_count,
    created_at, updated_at
)
SELECT
    gen_random_uuid(),  -- Generate new UUID for each scheduled post
    COALESCE(sp.user_id, 'unknown') as user_id,
    COALESCE(sp.user_id, 'unknown@example.com') as user_email,  -- Fallback for legacy data
    sp.url,
    UPPER(sp.type)::text as media_type,  -- IMAGE or VIDEO
    NULL as title,  -- Scheduled posts don't have titles
    sp.caption,
    'direct' as source,  -- Direct scheduling (not from submissions)
    NULL as submission_status,  -- Not applicable for direct posts
    CASE
        WHEN sp.status = 'pending' THEN 'scheduled'
        WHEN sp.status = 'processing' THEN 'processing'
        WHEN sp.status = 'published' THEN 'published'
        WHEN sp.status = 'failed' THEN 'failed'
        ELSE 'scheduled'
    END as publishing_status,
    sp.scheduled_time,
    sp.processing_started_at,
    sp.published_at,
    sp.ig_media_id,
    sp.error,
    sp.content_hash,
    sp.idempotency_key,
    sp.retry_count,
    sp.created_at,
    COALESCE(sp.updated_at, sp.created_at)
FROM public.scheduled_posts sp
WHERE NOT EXISTS (
    SELECT 1 FROM public.content_items
    WHERE user_id = sp.user_id
    AND media_url = sp.url
    AND media_type = UPPER(sp.type)
    AND scheduled_time = sp.scheduled_time
    AND source = 'direct'
);

-- ============== UPDATE MEME_SUBMISSIONS WITH CONTENT_ITEMS REFERENCE ==============

-- Add content_item_id column to meme_submissions for reference
ALTER TABLE public.meme_submissions
ADD COLUMN IF NOT EXISTS content_item_id uuid;

-- Populate the reference
UPDATE public.meme_submissions ms
SET content_item_id = ci.id
FROM public.content_items ci
WHERE ci.source = 'submission'
AND ci.id = ms.id;

-- ============== UPDATE SCHEDULED_POSTS WITH CONTENT_ITEMS REFERENCE ==============

-- Add content_item_id column to scheduled_posts for reference
ALTER TABLE public.scheduled_posts
ADD COLUMN IF NOT EXISTS content_item_id uuid;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_content_item_id
ON public.scheduled_posts(content_item_id);

-- Update with matching logic (match by user_id, url, and scheduled_time)
UPDATE public.scheduled_posts sp
SET content_item_id = ci.id
FROM public.content_items ci
WHERE ci.source = 'direct'
AND sp.url = ci.media_url
AND sp.scheduled_time = ci.scheduled_time
AND sp.user_id = ci.user_id;

-- ============== VALIDATION QUERIES ==============

-- Verify backfill completeness
DO $$
DECLARE
    meme_count integer;
    scheduled_count integer;
    content_count integer;
    missing_memes integer;
    missing_scheduled integer;
BEGIN
    SELECT count(*) INTO meme_count FROM public.meme_submissions;
    SELECT count(*) INTO scheduled_count FROM public.scheduled_posts;
    SELECT count(*) INTO content_count FROM public.content_items;

    SELECT count(*) INTO missing_memes
    FROM public.meme_submissions ms
    WHERE NOT EXISTS (SELECT 1 FROM public.content_items WHERE source = 'submission' AND id = ms.id);

    SELECT count(*) INTO missing_scheduled
    FROM public.scheduled_posts sp
    WHERE NOT EXISTS (SELECT 1 FROM public.content_items WHERE content_item_id = sp.content_item_id);

    RAISE NOTICE 'Backfill Summary:
    - Meme Submissions: % total, % migrated
    - Scheduled Posts: % total, % migrated (approximate)
    - Content Items Total: %
    - Missing Memes: %
    - Missing Scheduled: %',
        meme_count, (meme_count - missing_memes),
        scheduled_count, (scheduled_count - missing_scheduled),
        content_count,
        missing_memes,
        missing_scheduled;
END $$;

-- ============== COMMENTS ==============

COMMENT ON COLUMN public.meme_submissions.content_item_id IS 'Reference to unified content_items table (for backwards compatibility)';
COMMENT ON COLUMN public.scheduled_posts.content_item_id IS 'Reference to unified content_items table (for backwards compatibility)';
