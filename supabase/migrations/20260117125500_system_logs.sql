-- Create system_logs table for generic application logging
CREATE TABLE IF NOT EXISTS public.system_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    level text NOT NULL,        -- 'info', 'warn', 'error', 'debug'
    module text NOT NULL,       -- 'cron', 'api', 'scheduler', 'instagram'
    message text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT system_logs_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON public.system_logs
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Admins (specific user) can read
-- For now, let's just allow reading by service role to keep it simple and secure
-- We can add a policy for the admin user if needed later.

GRANT ALL ON public.system_logs TO service_role;
