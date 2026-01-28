-- Migration: Fix allowed_users RLS policy to prevent user enumeration
-- Security Issue: Previous policy allowed unauthenticated users to query all emails
-- Fix: Restrict SELECT to authenticated users checking their own email only

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can check allowed emails" ON public.allowed_users;

-- Create restrictive policy: authenticated users can only check their own email
CREATE POLICY "Users can check their own allowed status"
    ON public.allowed_users
    FOR SELECT
    USING (
        -- Allow users to check if their own email is whitelisted
        email = current_setting('request.jwt.claims', true)::jsonb->>'email'
        -- Service role has full access (for admin operations)
        OR auth.role() = 'service_role'
    );

COMMENT ON POLICY "Users can check their own allowed status" ON public.allowed_users IS
    'Prevents user enumeration by restricting SELECT to authenticated users checking their own email';
