-- Composed Videos: videos created from archived stories + audio tracks
-- These are the final output published to TikTok

CREATE TABLE IF NOT EXISTS public.composed_videos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    title text,
    local_path text,
    thumbnail_path text,
    duration_seconds numeric,
    file_size_bytes bigint,

    -- Source references
    story_ids uuid[] NOT NULL DEFAULT '{}',
    audio_track_id uuid REFERENCES public.audio_tracks(id) ON DELETE SET NULL,

    -- Composition lifecycle
    composition_status text NOT NULL DEFAULT 'pending'
        CHECK (composition_status IN ('pending', 'processing', 'completed', 'failed')),
    composition_error text,
    composition_config jsonb,
    processing_started_at timestamptz,
    processing_completed_at timestamptz,

    -- TikTok publishing
    tiktok_publish_status text
        CHECK (tiktok_publish_status IN ('pending', 'uploading', 'published', 'failed')),
    tiktok_publish_id text,
    tiktok_publish_error text,
    tiktok_published_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Find videos pending composition or publishing
CREATE INDEX IF NOT EXISTS idx_composed_videos_composition_status ON public.composed_videos (composition_status)
    WHERE composition_status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_composed_videos_tiktok_status ON public.composed_videos (tiktok_publish_status)
    WHERE tiktok_publish_status IN ('pending', 'uploading');

-- User's videos
CREATE INDEX IF NOT EXISTS idx_composed_videos_user ON public.composed_videos (user_id, created_at DESC);

-- RLS
ALTER TABLE public.composed_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own composed videos" ON public.composed_videos;
CREATE POLICY "Users can view own composed videos"
    ON public.composed_videos FOR SELECT
    USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role has full access to composed_videos" ON public.composed_videos;
CREATE POLICY "Service role has full access to composed_videos"
    ON public.composed_videos FOR ALL
    USING (auth.role() = 'service_role');
