-- Create publishing_logs table
CREATE TABLE IF NOT EXISTS public.publishing_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id text NOT NULL,                    -- NextAuth user ID
    media_url text NOT NULL,                   -- URL of the media published
    media_type text DEFAULT 'IMAGE',           -- IMAGE, VIDEO
    post_type text DEFAULT 'STORY',            -- STORY, FEED, REEL
    caption text,
    status text NOT NULL,                      -- 'SUCCESS', 'FAILED'
    ig_media_id text,                          -- Instagram Media ID (if success)
    error_message text,                        -- Error details (if failed)
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT publishing_logs_pkey PRIMARY KEY (id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_publishing_logs_user_id ON public.publishing_logs(user_id);

-- Enable RLS
ALTER TABLE public.publishing_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own logs
DROP POLICY IF EXISTS "Users can view own publishing logs" ON public.publishing_logs;
CREATE POLICY "Users can view own publishing logs"
    ON public.publishing_logs
    FOR SELECT
    USING (user_id = (select auth.uid())::text OR auth.role() = 'service_role');

-- Service role can insert logs (or authenticated users via server function)
DROP POLICY IF EXISTS "Users can insert own publishing logs" ON public.publishing_logs;
CREATE POLICY "Users can insert own publishing logs"
    ON public.publishing_logs
    FOR INSERT
    WITH CHECK (user_id = (select auth.uid())::text OR auth.role() = 'service_role');
    
-- Grant Permissions
GRANT ALL ON public.publishing_logs TO service_role;
GRANT ALL ON public.publishing_logs TO authenticated;
