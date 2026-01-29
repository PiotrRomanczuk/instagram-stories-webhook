-- Create email_whitelist table
CREATE TABLE IF NOT EXISTS public.email_whitelist (
    email text PRIMARY KEY,
    role text NOT NULL DEFAULT 'user',
    created_at timestamp with time zone DEFAULT now()
);

-- Backfill from allowed_users
INSERT INTO public.email_whitelist (email, role, created_at)
SELECT email, role, created_at FROM public.allowed_users
ON CONFLICT (email) DO NOTHING;

-- Ensure our dev user is there as developer
INSERT INTO public.email_whitelist (email, role)
VALUES ('p.romanczuk@gmail.com', 'developer')
ON CONFLICT (email) DO UPDATE SET role = 'developer';

-- Force another cache refresh
NOTIFY pgrst, 'reload schema';
