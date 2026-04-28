-- Audio Tracks: royalty-free music library for video composition
-- Tracks sourced from Pixabay Audio API and cached locally

CREATE TABLE IF NOT EXISTS public.audio_tracks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    artist text,
    source text NOT NULL DEFAULT 'pixabay' CHECK (source IN ('pixabay', 'manual')),
    source_id text,
    source_url text,
    local_path text NOT NULL,
    duration_seconds numeric NOT NULL,
    file_size_bytes bigint,
    genre text,
    tags text[] DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    usage_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate downloads from same source
CREATE UNIQUE INDEX IF NOT EXISTS idx_audio_tracks_source_id ON public.audio_tracks (source, source_id) WHERE source_id IS NOT NULL;

-- Random selection query: active tracks, weighted by usage_count
CREATE INDEX IF NOT EXISTS idx_audio_tracks_active ON public.audio_tracks (is_active, usage_count ASC) WHERE is_active = true;

-- RLS
ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to audio_tracks" ON public.audio_tracks;
CREATE POLICY "Service role has full access to audio_tracks"
    ON public.audio_tracks FOR ALL
    USING (auth.role() = 'service_role');
