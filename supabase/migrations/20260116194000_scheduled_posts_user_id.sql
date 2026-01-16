-- Migration: Add user_id to scheduled_posts
-- This allows us to track who scheduled a post and use their linked Facebook account for publishing

-- 1. Add user_id column
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 2. Add post_type and caption if they don't exist (ensuring consistency)
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'STORY';
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS caption TEXT;

-- 3. Create index for user_id
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON public.scheduled_posts(user_id);

-- 4. Update RLS policies for scheduled_posts
-- Allow users to only see and manage their own scheduled posts
DROP POLICY IF EXISTS "Users can manage own scheduled posts" ON public.scheduled_posts;
CREATE POLICY "Users can manage own scheduled posts"
    ON public.scheduled_posts
    FOR ALL
    USING (user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

-- Service role still has full access
DROP POLICY IF EXISTS "Service role has full access to scheduled posts" ON public.scheduled_posts;
CREATE POLICY "Service role has full access to scheduled posts"
    ON public.scheduled_posts
    FOR ALL
    USING (auth.role() = 'service_role');
