-- Auth Events: persistent log of every sign-in attempt.
-- Enables login history view and detection of suspicious patterns
-- (repeated denials for the same email, unexpected provider, etc.)

CREATE TABLE IF NOT EXISTS auth_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),

    email text NOT NULL,
    provider text NOT NULL,     -- 'google', 'test-credentials', 'facebook'

    -- 'granted' | 'denied'
    outcome text NOT NULL,

    -- Populated for denied logins
    deny_reason text,           -- 'not_in_whitelist', 'facebook_blocked', 'unknown_provider'

    -- Role assigned on successful login
    role text,

    -- Request context
    ip_address text,
    user_agent text
);

-- Indexes for admin login-history queries
CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON auth_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_email       ON auth_events (email);
CREATE INDEX IF NOT EXISTS idx_auth_events_outcome     ON auth_events (outcome);

-- 90-day automatic retention: remove old auth events
-- (Postgres pg_cron not assumed; handled by the cleanup cron job instead)

-- RLS: service_role writes only; no direct client access
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;
