-- Migration: Create linked_accounts table for multi-provider account linking
-- This enables users to link Facebook/Instagram to their Google-authenticated profile

-- 1. Create the linked_accounts table
CREATE TABLE IF NOT EXISTS public.linked_accounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id text NOT NULL,                    -- NextAuth user ID
    provider text NOT NULL,                    -- 'facebook', 'instagram', etc.
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

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_linked_accounts_user_id ON public.linked_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_provider ON public.linked_accounts(provider);

-- 3. Grant permissions
GRANT ALL ON public.linked_accounts TO service_role;
GRANT SELECT ON public.linked_accounts TO authenticated;

-- 4. Enable RLS
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Users can only read their own linked accounts
CREATE POLICY "Users can view own linked accounts"
    ON public.linked_accounts
    FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

-- Service role can do everything (for server-side operations)
CREATE POLICY "Service role has full access"
    ON public.linked_accounts
    FOR ALL
    USING (auth.role() = 'service_role');
