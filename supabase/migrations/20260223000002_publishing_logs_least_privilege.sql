-- Least privilege for publishing_logs.
--
-- The original migration (20260116212000_publishing_logs.sql) issued:
--   GRANT ALL ON public.publishing_logs TO authenticated;
--
-- "ALL" includes UPDATE and DELETE, which are not needed by any application code.
-- Publishing logs are meant to be an append-only audit trail from the user's
-- perspective (insert + read own records only).
--
-- This migration:
--   1. Revokes the over-broad ALL grant.
--   2. Grants only SELECT and INSERT to authenticated.
--   3. Replaces the existing RLS policies with cleaner equivalents that
--      explicitly list the operations they cover.

ALTER TABLE public.publishing_logs ENABLE ROW LEVEL SECURITY;

-- Step 1: Revoke over-broad privileges
REVOKE ALL ON public.publishing_logs FROM authenticated;

-- Step 2: Grant only SELECT and INSERT
GRANT SELECT, INSERT ON public.publishing_logs TO authenticated;

-- Step 3: Replace RLS policies
DROP POLICY IF EXISTS "Users can view own publishing logs"   ON public.publishing_logs;
DROP POLICY IF EXISTS "Users can insert own publishing logs" ON public.publishing_logs;

-- SELECT: users can only read their own records
CREATE POLICY "publishing_logs_select_own"
    ON public.publishing_logs
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid())::text);

-- INSERT: users can only create records attributed to themselves
CREATE POLICY "publishing_logs_insert_own"
    ON public.publishing_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid())::text);

-- service_role retains full access (bypasses RLS; explicit grant for clarity)
GRANT ALL ON public.publishing_logs TO service_role;
