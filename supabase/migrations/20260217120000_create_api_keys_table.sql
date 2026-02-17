-- Create api_keys table for mobile/widget API authentication
-- Supports user-specific API keys with scopes, expiration, and revocation

CREATE TABLE IF NOT EXISTS public.api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    key_hash text NOT NULL UNIQUE,
    key_prefix text NOT NULL,
    name text,
    scopes text[] DEFAULT ARRAY['cron:read', 'logs:read']::text[],
    last_used_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz DEFAULT NOW(),
    revoked_at timestamptz,
    CONSTRAINT api_keys_user_id_check CHECK (char_length(user_id) > 0),
    CONSTRAINT api_keys_key_hash_check CHECK (char_length(key_hash) > 0),
    CONSTRAINT api_keys_key_prefix_check CHECK (char_length(key_prefix) > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_revoked_at ON public.api_keys(revoked_at) WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own API keys
CREATE POLICY "Users can view their own API keys"
    ON public.api_keys
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- Users can insert their own API keys
CREATE POLICY "Users can insert their own API keys"
    ON public.api_keys
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own API keys (for revocation)
CREATE POLICY "Users can update their own API keys"
    ON public.api_keys
    FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Users can delete their own API keys
CREATE POLICY "Users can delete their own API keys"
    ON public.api_keys
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

-- Add comment
COMMENT ON TABLE public.api_keys IS 'API keys for mobile/widget authentication with bearer token support';
