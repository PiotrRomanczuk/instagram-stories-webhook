-- Enable RLS on email_whitelist
ALTER TABLE public.email_whitelist ENABLE ROW LEVEL SECURITY;

-- Drop existing if any
DROP POLICY IF EXISTS "Users can check their own whitelist status" ON public.email_whitelist;
DROP POLICY IF EXISTS "Service role has full access to whitelist" ON public.email_whitelist;

-- Policy: Users can see their own role
CREATE POLICY "Users can check their own whitelist status"
    ON public.email_whitelist
    FOR SELECT
    USING (
        email = (current_setting('request.jwt.claims', true)::jsonb->>'email')::text
        OR auth.role() = 'service_role'
    );

-- Policy: Admin management (service role)
CREATE POLICY "Service role has full access to whitelist"
    ON public.email_whitelist
    FOR ALL
    USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.email_whitelist TO authenticated;
GRANT ALL ON public.email_whitelist TO service_role;

-- Force cache refresh
NOTIFY pgrst, 'reload schema';
