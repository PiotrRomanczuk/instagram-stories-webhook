-- Track refresh token expiry separately from access token expiry.
-- Used for TikTok where access tokens expire in 24h but refresh tokens last 365d.

ALTER TABLE public.linked_accounts
ADD COLUMN IF NOT EXISTS refresh_expires_at bigint;

COMMENT ON COLUMN public.linked_accounts.refresh_expires_at
    IS 'Refresh token expiry as ms epoch (e.g., TikTok refresh token, ~365d).';
