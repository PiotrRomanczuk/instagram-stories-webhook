-- Recreate auth_events table.
--
-- Background: 20260222000002_auth_events.sql is recorded as applied in
-- supabase_migrations.schema_migrations, but the table does not exist
-- in any schema. This migration is idempotent so it can run safely
-- whether or not the original DDL ever took effect.
--
-- The DDL below is identical to the original migration.

CREATE TABLE IF NOT EXISTS public.auth_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),

    email text NOT NULL,
    provider text NOT NULL,

    outcome text NOT NULL,

    deny_reason text,
    role text,

    ip_address text,
    user_agent text
);

CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON public.auth_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_email      ON public.auth_events (email);
CREATE INDEX IF NOT EXISTS idx_auth_events_outcome    ON public.auth_events (outcome);

ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;
