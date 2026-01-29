-- Migration: Create unified content_items table
-- Unifies meme_submissions and scheduled_posts into a single table
-- with source tracking (submission vs direct) and dual-status workflow

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
CREATE INDEX IF NOT EXISTS idx_content_items_content_hash ON public.content_items(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_items_idempotency ON public.content_items(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_items_processing ON public.content_items(publishing_status, processing_started_at) WHERE publishing_status = 'processing';

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_content_items_user_scheduled ON public.content_items(user_id, publishing_status, scheduled_time) WHERE publishing_status IN ('scheduled', 'processing');
CREATE INDEX IF NOT EXISTS idx_content_items_review_queue ON public.content_items(source, submission_status, created_at DESC) WHERE source = 'submission' AND submission_status = 'pending';

-- ============== GRANT PERMISSIONS ==============

GRANT ALL ON public.content_items TO service_role;
GRANT SELECT, INSERT ON public.content_items TO authenticated;

-- ============== ENABLE RLS ==============

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

-- ============== RLS POLICIES ==============

-- Users can view their own content
CREATE POLICY "Users can view own content"
    ON public.content_items
    FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

-- Admins can view all content (via service role)
CREATE POLICY "Service role can view all content"
    ON public.content_items
    FOR SELECT
    USING (auth.role() = 'service_role');

-- Users can insert their own content
CREATE POLICY "Users can create content"
    ON public.content_items
    FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

-- Users can update their own draft/scheduled content (not published)
CREATE POLICY "Users can update own draft content"
    ON public.content_items
    FOR UPDATE
    USING (
        user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
        AND publishing_status IN ('draft', 'scheduled')
    );

-- Users can delete their own draft/pending content
CREATE POLICY "Users can delete own draft content"
    ON public.content_items
    FOR DELETE
    USING (
        user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
        AND (
            publishing_status = 'draft'
            OR (source = 'submission' AND submission_status = 'pending')
        )
    );

-- Service role has full access for admin operations
CREATE POLICY "Service role has full access"
    ON public.content_items
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============== COMMENTS ==============

COMMENT ON TABLE public.content_items IS 'Unified table for all content (meme submissions and scheduled posts)';
COMMENT ON COLUMN public.content_items.source IS 'Origin: submission (community) or direct (user scheduling)';
COMMENT ON COLUMN public.content_items.submission_status IS 'For submissions only: pending, approved, rejected';
COMMENT ON COLUMN public.content_items.publishing_status IS 'Publishing lifecycle: draft, scheduled, processing, published, failed';
COMMENT ON COLUMN public.content_items.version IS 'Optimistic locking counter for concurrent edit prevention';

-- ============== MIGRATION HELPER FUNCTIONS ==============

-- Function to check if we should use the unified table or backfill
CREATE OR REPLACE FUNCTION public.get_content_item_count()
RETURNS TABLE(total integer) AS $$
BEGIN
    RETURN QUERY SELECT count(*)::integer FROM public.content_items;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate migration completeness
CREATE OR REPLACE FUNCTION public.validate_content_migration()
RETURNS TABLE(
    meme_count bigint,
    scheduled_count bigint,
    content_items_count bigint,
    migration_complete boolean
) AS $$
DECLARE
    meme_cnt bigint;
    scheduled_cnt bigint;
    content_cnt bigint;
BEGIN
    SELECT count(*) INTO meme_cnt FROM public.meme_submissions;
    SELECT count(*) INTO scheduled_cnt FROM public.scheduled_posts;
    SELECT count(*) INTO content_cnt FROM public.content_items;

    RETURN QUERY SELECT
        meme_cnt,
        scheduled_cnt,
        content_cnt,
        (meme_cnt + scheduled_cnt = content_cnt)::boolean;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
