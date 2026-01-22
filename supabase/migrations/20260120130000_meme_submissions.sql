-- Migration: Create meme_submissions table and allowed_users whitelist
-- Enables community meme submissions that admin can review and publish to IG

-- 1. Create allowed_users whitelist table
CREATE TABLE IF NOT EXISTS public.allowed_users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    role text NOT NULL DEFAULT 'user',  -- 'admin' or 'user'
    display_name text,
    added_by text,                       -- Admin who added this user
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT allowed_users_pkey PRIMARY KEY (id)
);

-- 2. Create meme_submissions table
CREATE TABLE IF NOT EXISTS public.meme_submissions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id text NOT NULL,                    -- NextAuth user ID (submitter)
    user_email text NOT NULL,                 -- Email for display
    media_url text NOT NULL,                  -- URL in Supabase storage or external
    storage_path text,                        -- If stored in Supabase, the path for cleanup
    title text,                               -- Optional title/description
    caption text,                             -- Caption for when published
    status text NOT NULL DEFAULT 'pending',   -- pending, approved, rejected, published, scheduled
    rejection_reason text,                    -- Why it was rejected (if applicable)
    created_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    reviewed_by text,                         -- Admin user ID who reviewed
    scheduled_time bigint,                    -- If scheduled, when to publish (Unix ms)
    scheduled_post_id text,                   -- Reference to scheduled_posts if queued
    published_at timestamp with time zone,
    ig_media_id text,                         -- Instagram media ID after publishing
    
    CONSTRAINT meme_submissions_pkey PRIMARY KEY (id)
);

-- 3. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_allowed_users_email ON public.allowed_users(email);
CREATE INDEX IF NOT EXISTS idx_allowed_users_role ON public.allowed_users(role);
CREATE INDEX IF NOT EXISTS idx_meme_submissions_user_id ON public.meme_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_meme_submissions_status ON public.meme_submissions(status);
CREATE INDEX IF NOT EXISTS idx_meme_submissions_created_at ON public.meme_submissions(created_at DESC);

-- 4. Grant permissions
GRANT ALL ON public.allowed_users TO service_role;
GRANT SELECT ON public.allowed_users TO authenticated;

GRANT ALL ON public.meme_submissions TO service_role;
GRANT SELECT, INSERT ON public.meme_submissions TO authenticated;

-- 5. Enable RLS
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meme_submissions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for allowed_users
-- Everyone can check if their email is allowed (for login flow)
CREATE POLICY "Anyone can check allowed emails"
    ON public.allowed_users
    FOR SELECT
    USING (true);

-- Service role can manage the whitelist
CREATE POLICY "Service role manages allowed users"
    ON public.allowed_users
    FOR ALL
    USING (auth.role() = 'service_role');

-- 7. RLS Policies for meme_submissions
-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
    ON public.meme_submissions
    FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

-- Users can insert their own submissions
CREATE POLICY "Users can create submissions"
    ON public.meme_submissions
    FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

-- Service role has full access (for admin operations)
CREATE POLICY "Service role has full access to submissions"
    ON public.meme_submissions
    FOR ALL
    USING (auth.role() = 'service_role');

-- 8. Seed the admin email from environment (will need to be done manually or via API)
-- INSERT INTO public.allowed_users (email, role, display_name) 
-- VALUES ('admin@example.com', 'admin', 'Admin User')
-- ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE public.allowed_users IS 'Whitelist of users allowed to access the meme submission system';
COMMENT ON TABLE public.meme_submissions IS 'Community-submitted memes pending admin review and publishing';
