-- Add onboarding + creator profile fields to public.users.
-- All columns are nullable so existing rows remain valid; onboarded_at is the
-- gate the middleware uses to decide whether a user must complete /welcome.

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS onboarded_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS display_name text,
    ADD COLUMN IF NOT EXISTS handle text,
    ADD COLUMN IF NOT EXISTS contact_email text,
    ADD COLUMN IF NOT EXISTS guidelines_acknowledged_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_users_onboarded_at ON public.users(onboarded_at);
