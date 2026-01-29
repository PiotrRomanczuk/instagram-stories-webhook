-- Migration: Force Create unified content_items table and backfill
-- This migration unifies meme_submissions and scheduled_posts into a single table

-- ============== CREATE UNIFIED TABLE ==============

CREATE TABLE IF NOT EXISTS public.content_items (
    -- Identity
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    user_email text NOT NULL,

    -- Media
    media_url text NOT NULL,
    media_type text NOT NULL DEFAULT 'IMAGE',  -- 'IMAGE' | 'VIDEO'
    storage_path text,                          -- For cleanup if stored in Supabase
    dimensions jsonb,                           -- {width, height}

    -- Content
    title text,                                 -- Optional, for submissions
    caption text,                               -- Max 2200 chars
    user_tags jsonb,                            -- [{"username": "...", "x": 0-1, "y": 0-1}]
    hashtags text[],                            -- Array of hashtags

    -- Source & Workflow
    source text NOT NULL DEFAULT 'direct',      -- 'submission' | 'direct'
    submission_status text,                     -- 'pending' | 'approved' | 'rejected' (only for submissions)
    publishing_status text NOT NULL DEFAULT 'draft',  -- 'draft' | 'scheduled' | 'processing' | 'published' | 'failed'

    -- Review (for submissions only)
    rejection_reason text,
    reviewed_at timestamp with time zone,
    reviewed_by text,

    -- Scheduling
    scheduled_time bigint,                      -- Unix timestamp in milliseconds
    processing_started_at timestamp with time zone,

    -- Publishing
    published_at timestamp with time zone,
    ig_media_id text,
    error text,

    -- Metadata
    content_hash text,                          -- For duplicate detection
    idempotency_key text,                       -- For deduplication
    retry_count integer DEFAULT 0,
    version integer DEFAULT 1,                  -- Optimistic locking

    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT content_items_pkey PRIMARY KEY (id)
);

-- ============== CREATE INDEXES ==============

CREATE INDEX IF NOT EXISTS idx_content_items_user_id ON public.content_items(user_id);
CREATE INDEX IF NOT EXISTS idx_content_items_source ON public.content_items(source);
CREATE INDEX IF NOT EXISTS idx_content_items_submission_status ON public.content_items(submission_status) WHERE source = 'submission';
CREATE INDEX IF NOT EXISTS idx_content_items_publishing_status ON public.content_items(publishing_status);
CREATE INDEX IF NOT EXISTS idx_content_items_scheduled_time ON public.content_items(scheduled_time) WHERE publishing_status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_content_items_created_at ON public.content_items(created_at DESC);

-- ============== BACKFILL FROM MEME_SUBMISSIONS ==============

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
    'IMAGE' as media_type,
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
    ms.created_at
FROM public.meme_submissions ms
WHERE NOT EXISTS (
    SELECT 1 FROM public.content_items WHERE id = ms.id
) ON CONFLICT (id) DO NOTHING;

-- ============== BACKFILL FROM SCHEDULED_POSTS ==============

INSERT INTO public.content_items (
    user_id, user_email, media_url, media_type, title, caption,
    source, submission_status, publishing_status,
    scheduled_time, processing_started_at, published_at, ig_media_id, error,
    content_hash, idempotency_key, retry_count,
    created_at, updated_at
)
SELECT
    COALESCE(sp.user_id, 'unknown') as user_id,
    COALESCE(sp.user_id, 'unknown@example.com') as user_email,
    sp.url,
    UPPER(sp.type)::text as media_type,
    NULL as title,
    sp.caption,
    'direct' as source,
    NULL as submission_status,
    CASE
        WHEN sp.status = 'pending' THEN 'scheduled'
        WHEN sp.status = 'processing' THEN 'processing'
        WHEN sp.status = 'published' THEN 'published'
        WHEN sp.status = 'failed' THEN 'failed'
        ELSE 'scheduled'
    END as publishing_status,
    sp.scheduled_time,
    sp.processing_started_at,
    CASE WHEN sp.published_at IS NOT NULL THEN to_timestamp(sp.published_at / 1000.0) ELSE NULL END,
    sp.ig_media_id,
    sp.error,
    sp.content_hash,
    sp.idempotency_key,
    sp.retry_count,
    to_timestamp(sp.created_at / 1000.0),
    COALESCE(sp.updated_at, to_timestamp(sp.created_at / 1000.0))
FROM public.scheduled_posts sp
WHERE NOT EXISTS (
    SELECT 1 FROM public.content_items
    WHERE user_id = sp.user_id
    AND media_url = sp.url
    AND scheduled_time = sp.scheduled_time
    AND source = 'direct'
);

-- ============== GRANT PERMISSIONS ==============

GRANT ALL ON public.content_items TO service_role;
GRANT SELECT, INSERT ON public.content_items TO authenticated;

-- ============== ENABLE RLS ==============

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

-- Force cache refresh
NOTIFY pgrst, 'reload schema';
