-- Migration: AI Analysis Storage Setup (Pro Plan)
-- Creates infrastructure for saving published memes for AI analysis
-- Enables performance tracking and content insights

-- 1. Create ai_analysis bucket (private, for admin access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-analysis', 'ai-analysis', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Create ai_meme_analysis table
-- Tracks which memes have been sent for AI analysis
CREATE TABLE IF NOT EXISTS public.ai_meme_analysis (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    meme_id uuid NOT NULL,                              -- References meme_submissions.id
    ig_media_id text NOT NULL,                          -- Instagram media ID (for reference)
    storage_path text NOT NULL,                         -- Path in ai-analysis bucket
    analysis_status text NOT NULL DEFAULT 'pending',    -- pending, processed, failed, archived
    file_type text NOT NULL,                            -- image or video
    file_size_bytes bigint,                             -- Size for analytics
    analysis_data jsonb,                                -- AI analysis results (to be populated)
    error_message text,                                 -- If analysis failed
    created_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    archived_at timestamp with time zone,

    CONSTRAINT ai_meme_analysis_pkey PRIMARY KEY (id),
    CONSTRAINT ai_meme_analysis_meme_id_fk FOREIGN KEY (meme_id) REFERENCES public.meme_submissions(id) ON DELETE CASCADE,
    CONSTRAINT ai_meme_analysis_unique_ig_media UNIQUE (ig_media_id)
);

-- 3. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_meme_analysis_meme_id ON public.ai_meme_analysis(meme_id);
CREATE INDEX IF NOT EXISTS idx_ai_meme_analysis_status ON public.ai_meme_analysis(analysis_status);
CREATE INDEX IF NOT EXISTS idx_ai_meme_analysis_created_at ON public.ai_meme_analysis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_meme_analysis_ig_media_id ON public.ai_meme_analysis(ig_media_id);

-- 4. Grant permissions
GRANT ALL ON public.ai_meme_analysis TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.ai_meme_analysis TO authenticated;

-- 5. Enable RLS
ALTER TABLE public.ai_meme_analysis ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for ai_meme_analysis
-- Admin and Developer can view all analysis records
CREATE POLICY "Admins can view all analysis"
    ON public.ai_meme_analysis
    FOR SELECT
    USING (
        auth.role() = 'service_role' OR
        (auth.role() = 'authenticated' AND
         (SELECT role FROM public.allowed_users WHERE email = current_setting('request.jwt.claims', true)::jsonb ->> 'email')
         IN ('admin', 'developer'))
    );

-- Service role has full access
CREATE POLICY "Service role has full access to analysis"
    ON public.ai_meme_analysis
    FOR ALL
    USING (auth.role() = 'service_role');

-- 7. Storage policies for ai-analysis bucket (private)
-- Only service role can upload to ai-analysis bucket
CREATE POLICY "Service role uploads to ai-analysis"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'ai-analysis' AND auth.role() = 'service_role');

-- Only service role can read from ai-analysis bucket
CREATE POLICY "Service role reads from ai-analysis"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'ai-analysis' AND auth.role() = 'service_role');

-- Service role can delete from ai-analysis bucket
CREATE POLICY "Service role deletes from ai-analysis"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'ai-analysis' AND auth.role() = 'service_role');

COMMENT ON TABLE public.ai_meme_analysis IS 'Tracks published memes saved for AI analysis and processing';
COMMENT ON COLUMN public.ai_meme_analysis.analysis_status IS 'pending (awaiting analysis), processed (analysis complete), failed (analysis error), archived (old data)';
COMMENT ON COLUMN public.ai_meme_analysis.analysis_data IS 'JSON results from AI analysis - engagement predictions, sentiment, topics, etc.';
