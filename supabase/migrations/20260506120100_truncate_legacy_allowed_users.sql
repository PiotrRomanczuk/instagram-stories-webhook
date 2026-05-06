-- Truncate legacy allowed_users table.
--
-- Background: allowed_users was superseded by email_whitelist
-- (20260129202629_create_email_whitelist.sql) and all runtime code
-- (lib/memes-db/allowed-users.ts, lib/memes-db/user-management.ts) reads
-- and writes email_whitelist exclusively. The 5 rows in allowed_users have
-- diverged from the canonical 6-row email_whitelist, creating audit
-- confusion.
--
-- We TRUNCATE rather than DROP because:
--   1. The RLS policy "Admins can view all analysis" on public.ai_meme_analysis
--      joins through allowed_users to determine admin role. Dropping would
--      break admin reads at runtime.
--   2. The 20260129202629_create_email_whitelist migration backfills from
--      allowed_users; dropping would break replay on fresh DBs.
--
-- A follow-up PR should rewrite the ai_meme_analysis policy to use
-- email_whitelist and then drop allowed_users.

TRUNCATE TABLE public.allowed_users;
