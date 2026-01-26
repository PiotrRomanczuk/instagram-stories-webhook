-- Migration to move NextAuth tables to public schema for easier access
-- (Fixes 500 Error due to next_auth schema not being exposed)

-- 1. Create Tables in PUBLIC schema

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text,
    email text,
    "emailVerified" timestamp with time zone,
    image text,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT email_unique UNIQUE (email)
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    expires timestamp with time zone NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" uuid DEFAULT NULL,
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessionToken_unique UNIQUE ("sessionToken"),
    CONSTRAINT sessions_userId_fkey FOREIGN KEY ("userId")
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at bigint,
    token_type text,
    scope text,
    id_token text,
    session_state text,
    "userId" uuid DEFAULT NULL,
    CONSTRAINT accounts_pkey PRIMARY KEY (id),
    CONSTRAINT provider_unique UNIQUE (provider, "providerAccountId"),
    CONSTRAINT accounts_userId_fkey FOREIGN KEY ("userId")
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- Verification Tokens Table
CREATE TABLE IF NOT EXISTS public.verification_tokens (
    identifier text,
    token text PRIMARY KEY,
    expires timestamp with time zone NOT NULL
);

-- 2. Create Helper Function for RLS
CREATE OR REPLACE FUNCTION public.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select
  	coalesce(
		nullif(current_setting('request.jwt.claim.sub', true), ''),
		(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
	)::uuid
$$;

-- 3. Grant Permissions to Service Role (Critical for Adapter)
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.sessions TO service_role;
GRANT ALL ON TABLE public.accounts TO service_role;
GRANT ALL ON TABLE public.verification_tokens TO service_role;

-- 4. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (Using built-in auth logic, not jwt table)
-- Note: 'service_role' always bypasses RLS by default in Supabase unless forced otherwise.
-- But we can add a policy just in case.
-- We use "auth.role() = 'service_role'" which is standard.

DROP POLICY IF EXISTS "Service role has full access to users" ON public.users;
CREATE POLICY "Service role has full access to users" ON public.users FOR ALL USING ( auth.role() = 'service_role' ) WITH CHECK ( auth.role() = 'service_role' );

DROP POLICY IF EXISTS "Service role has full access to sessions" ON public.sessions;
CREATE POLICY "Service role has full access to sessions" ON public.sessions FOR ALL USING ( auth.role() = 'service_role' ) WITH CHECK ( auth.role() = 'service_role' );

DROP POLICY IF EXISTS "Service role has full access to accounts" ON public.accounts;
CREATE POLICY "Service role has full access to accounts" ON public.accounts FOR ALL USING ( auth.role() = 'service_role' ) WITH CHECK ( auth.role() = 'service_role' );

DROP POLICY IF EXISTS "Service role has full access to verification_tokens" ON public.verification_tokens;
CREATE POLICY "Service role has full access to verification_tokens" ON public.verification_tokens FOR ALL USING ( auth.role() = 'service_role' ) WITH CHECK ( auth.role() = 'service_role' );

-- Also allow "authenticated" users to see their own data if needed (usually handled by NextAuth internally via service role)
-- But for NextAuth, the ADAPTER uses the service_role key, so RLS doesn't apply to the adapter itself.
-- These policies are just to ensure we don't accidentally block it if environment settings change.
