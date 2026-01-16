-- Consolidated migration for Account Linking feature

-- 1. Create linked_accounts table
CREATE TABLE IF NOT EXISTS public.linked_accounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id text NOT NULL,                    -- NextAuth user ID
    provider text NOT NULL,                    -- 'facebook'
    provider_account_id text NOT NULL,         -- Provider's user ID
    access_token text NOT NULL,
    refresh_token text,
    expires_at bigint,                         -- Unix timestamp in milliseconds
    ig_user_id text,                           -- Instagram Business Account ID
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT linked_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT linked_accounts_user_provider_unique UNIQUE (user_id, provider)
);

-- 2. Update scheduled_posts with user_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scheduled_posts' AND column_name='user_id') THEN
        ALTER TABLE public.scheduled_posts ADD COLUMN user_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scheduled_posts' AND column_name='post_type') THEN
        ALTER TABLE public.scheduled_posts ADD COLUMN post_type TEXT DEFAULT 'STORY';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scheduled_posts' AND column_name='caption') THEN
        ALTER TABLE public.scheduled_posts ADD COLUMN caption TEXT;
    END IF;
END $$;

-- 3. Create Indexes
CREATE INDEX IF NOT EXISTS idx_linked_accounts_user_id ON public.linked_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON public.scheduled_posts(user_id);

-- 4. Enable RLS
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Users can only see their own linked accounts
DROP POLICY IF EXISTS "Users can view own linked accounts" ON public.linked_accounts;
CREATE POLICY "Users can view own linked accounts"
    ON public.linked_accounts
    FOR ALL
    USING (user_id = (select auth.uid())::text OR auth.role() = 'service_role');

-- Users can manage their own scheduled posts
DROP POLICY IF EXISTS "Users can manage own scheduled posts" ON public.scheduled_posts;
CREATE POLICY "Users can manage own scheduled posts"
    ON public.scheduled_posts
    FOR ALL
    USING (user_id = (select auth.uid())::text OR auth.role() = 'service_role');

-- 6. Grant Permissions
GRANT ALL ON public.linked_accounts TO service_role;
GRANT ALL ON public.linked_accounts TO authenticated;
GRANT ALL ON public.scheduled_posts TO service_role;
GRANT ALL ON public.scheduled_posts TO authenticated;
