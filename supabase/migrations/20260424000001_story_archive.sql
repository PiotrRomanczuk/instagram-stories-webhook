-- Story Archive: stores downloaded Instagram stories for engagement analysis
-- Stories are ingested content (from Instagram) not published content (to Instagram)

CREATE TABLE public.story_archive (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    ig_media_id text NOT NULL,
    ig_user_id text NOT NULL,
    media_type text NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO')),
    media_url_original text NOT NULL,
    local_path text,
    thumbnail_path text,
    caption text,
    permalink text,
    ig_timestamp timestamptz NOT NULL,
    dimensions jsonb,
    video_duration numeric,
    file_size_bytes bigint,

    -- Engagement metrics (populated by insights fetch)
    impressions integer,
    reach integer,
    replies integer,
    taps_forward integer,
    taps_back integer,
    exits integer,
    engagement_score numeric,
    insights_fetched_at timestamptz,

    -- Download lifecycle
    download_status text NOT NULL DEFAULT 'pending'
        CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed')),
    download_error text,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate downloads
CREATE UNIQUE INDEX idx_story_archive_ig_media_id ON public.story_archive (ig_media_id);

-- Ranking queries: top stories by engagement per user
CREATE INDEX idx_story_archive_engagement ON public.story_archive (user_id, engagement_score DESC NULLS LAST);

-- Cron processing: find pending downloads
CREATE INDEX idx_story_archive_download_status ON public.story_archive (download_status) WHERE download_status != 'completed';

-- Recent-first ordering
CREATE INDEX idx_story_archive_timestamp ON public.story_archive (ig_timestamp DESC);

-- RLS
ALTER TABLE public.story_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own archived stories"
    ON public.story_archive FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "Service role has full access to story_archive"
    ON public.story_archive FOR ALL
    USING (auth.role() = 'service_role');
