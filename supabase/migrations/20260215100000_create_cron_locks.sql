-- Create cron_locks table for distributed cron job locking
CREATE TABLE IF NOT EXISTS public.cron_locks (
    lock_name text PRIMARY KEY,
    locked_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);

ALTER TABLE public.cron_locks ENABLE ROW LEVEL SECURITY;

-- Only service_role should access cron locks
CREATE POLICY "Service role manages cron locks"
    ON public.cron_locks
    FOR ALL
    USING (auth.role() = 'service_role');

GRANT ALL ON public.cron_locks TO service_role;
