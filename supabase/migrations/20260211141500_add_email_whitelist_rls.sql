-- Migration: Add proper RLS policies for email_whitelist
-- BMS-146: email_whitelist was missing admin-level RLS policies
-- Admins get full CRUD access, users can only see their own email entry

-- Drop existing policies to recreate with proper admin support
DROP POLICY IF EXISTS "Users can check their own whitelist status" ON public.email_whitelist;
DROP POLICY IF EXISTS "Service role has full access to whitelist" ON public.email_whitelist;

-- Policy: Admins (role = 'admin' or 'developer') get full read access
CREATE POLICY "Admins can read all whitelist entries"
    ON public.email_whitelist
    FOR SELECT
    USING (
        (current_setting('request.jwt.claims', true)::jsonb->>'role') IN ('admin', 'developer')
        OR email = (current_setting('request.jwt.claims', true)::jsonb->>'email')::text
        OR auth.role() = 'service_role'
    );

-- Policy: Admins can insert new whitelist entries
CREATE POLICY "Admins can insert whitelist entries"
    ON public.email_whitelist
    FOR INSERT
    WITH CHECK (
        (current_setting('request.jwt.claims', true)::jsonb->>'role') IN ('admin', 'developer')
        OR auth.role() = 'service_role'
    );

-- Policy: Admins can update whitelist entries
CREATE POLICY "Admins can update whitelist entries"
    ON public.email_whitelist
    FOR UPDATE
    USING (
        (current_setting('request.jwt.claims', true)::jsonb->>'role') IN ('admin', 'developer')
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        (current_setting('request.jwt.claims', true)::jsonb->>'role') IN ('admin', 'developer')
        OR auth.role() = 'service_role'
    );

-- Policy: Admins can delete whitelist entries
CREATE POLICY "Admins can delete whitelist entries"
    ON public.email_whitelist
    FOR DELETE
    USING (
        (current_setting('request.jwt.claims', true)::jsonb->>'role') IN ('admin', 'developer')
        OR auth.role() = 'service_role'
    );

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';
