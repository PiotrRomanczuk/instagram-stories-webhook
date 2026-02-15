-- Add RLS policy to api_quota_history (RLS enabled but no policies existed)
CREATE POLICY "Service role manages quota history"
    ON public.api_quota_history
    FOR ALL
    USING (auth.role() = 'service_role');

GRANT ALL ON public.api_quota_history TO service_role;
