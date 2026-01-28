-- Tracking table for pending uploads to detect and cleanup orphaned storage files
CREATE TABLE IF NOT EXISTS public.pending_uploads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    storage_path text NOT NULL UNIQUE,
    user_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT pending_uploads_pkey PRIMARY KEY (id)
);

-- Index for efficient cleanup (older than 1 hour)
CREATE INDEX IF NOT EXISTS idx_pending_uploads_created_at ON public.pending_uploads(created_at);

-- Enable RLS
ALTER TABLE public.pending_uploads ENABLE ROW LEVEL SECURITY;

-- Users can manage their own pending uploads
CREATE POLICY "Users can manage own pending uploads"
    ON public.pending_uploads FOR ALL
    USING (user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

-- Service role has full access
CREATE POLICY "Service role has full access to pending uploads"
    ON public.pending_uploads FOR ALL
    USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON public.pending_uploads TO service_role;
GRANT ALL ON public.pending_uploads TO authenticated;

COMMENT ON TABLE public.pending_uploads IS 'Temporary storage for file paths that have been uploaded but not yet confirmed in a meme submission';
