-- Defense-in-depth: revoke direct SELECT on encrypted-token columns of
-- public.linked_accounts from the `authenticated` and `anon` roles.
--
-- THREAT MODEL
-- -----------
-- public.linked_accounts protects rows with an RLS policy keyed on the JWT
-- `sub` claim (`user_id = auth.uid()::text`). If `SUPABASE_JWT_SECRET` ever
-- leaks (e.g., committed to a repo, exposed via Vercel env dump, or stolen
-- from CI logs), an attacker can mint a valid JWT for any `user_id` and
-- read every row's `access_token` / `refresh_token`. Encryption-at-rest via
-- TOKEN_ENCRYPTION_KEY mitigates that, but only because the encryption key
-- lives in a different env var. We want belt-and-suspenders: even with a
-- forged JWT, a client using the anon key MUST NOT be able to SELECT the
-- raw token columns.
--
-- IMPLEMENTATION
-- --------------
-- - Column-level REVOKE on (access_token, refresh_token) for both
--   `authenticated` and `anon`. Postgres column grants override row-level
--   policies for column visibility — even a row the user is allowed to see
--   will return NULL/permission-denied for the revoked columns.
-- - `service_role` is unaffected (it bypasses RLS and column grants by
--   design). Server-side code using `supabaseAdmin` continues to work.
-- - Non-token columns (id, user_id, provider, expires_at, ig_user_id,
--   ig_username, platform_user_id, refresh_expires_at, created_at,
--   updated_at) remain readable by `authenticated` so existing UI flows
--   that list connected accounts still function.

-- ---------------------------------------------------------------------------
-- linked_accounts: revoke token columns from authenticated + anon
-- ---------------------------------------------------------------------------

REVOKE SELECT (access_token, refresh_token)
    ON public.linked_accounts FROM authenticated;

REVOKE SELECT (access_token, refresh_token)
    ON public.linked_accounts FROM anon;

-- Also revoke INSERT/UPDATE on these columns so an authenticated client
-- cannot overwrite a victim's stored token via a forged JWT.
REVOKE INSERT (access_token, refresh_token)
    ON public.linked_accounts FROM authenticated;

REVOKE UPDATE (access_token, refresh_token)
    ON public.linked_accounts FROM authenticated;

REVOKE INSERT (access_token, refresh_token)
    ON public.linked_accounts FROM anon;

REVOKE UPDATE (access_token, refresh_token)
    ON public.linked_accounts FROM anon;

-- Reaffirm service_role full access for clarity (no-op if already granted).
GRANT ALL ON public.linked_accounts TO service_role;

COMMENT ON COLUMN public.linked_accounts.access_token
    IS 'Encrypted access token. Direct client SELECT is REVOKED — only service_role may read this column.';

COMMENT ON COLUMN public.linked_accounts.refresh_token
    IS 'Encrypted refresh token. Direct client SELECT is REVOKED — only service_role may read this column.';
