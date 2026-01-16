
-- 1. Create the schema
CREATE SCHEMA IF NOT EXISTS next_auth;

-- 2. Grant Schema Permissions
GRANT USAGE ON SCHEMA next_auth TO service_role;
GRANT USAGE ON SCHEMA next_auth TO anon;
GRANT USAGE ON SCHEMA next_auth TO authenticated;

-- 3. Custom uid() function for RLS (Recognizes Auth.js JWTs)
CREATE OR REPLACE FUNCTION next_auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select
  	coalesce(
		nullif(current_setting('request.jwt.claim.sub', true), ''),
		(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
	)::uuid
$$;

-- 4. Create Tables

-- Users Table
CREATE TABLE IF NOT EXISTS next_auth.users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text,
    email text,
    "emailVerified" timestamp with time zone,
    image text,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT email_unique UNIQUE (email)
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS next_auth.sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    expires timestamp with time zone NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" uuid DEFAULT NULL,
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessionToken_unique UNIQUE ("sessionToken"),
    CONSTRAINT sessions_userId_fkey FOREIGN KEY ("userId")
        REFERENCES next_auth.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- Accounts Table
CREATE TABLE IF NOT EXISTS next_auth.accounts (
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
        REFERENCES next_auth.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- Verification Tokens Table
CREATE TABLE IF NOT EXISTS next_auth.verification_tokens (
    identifier text,
    token text PRIMARY KEY,
    expires timestamp with time zone NOT NULL
);

-- 5. Grant Table Permissions
GRANT ALL ON ALL TABLES IN SCHEMA next_auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA next_auth TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA next_auth TO service_role;

-- 6. Expose Schema to API (PostgREST configuration)
-- NOTE: The following lines usually require Superuser access. 
-- In the Supabase Dashboard SQL Editor, run these manually if they fail here:
-- ALTER DATABASE postgres SET "pgrst.db_schemas" = 'public, next_auth, graphql_public';
-- SELECT pg_notify('pgrst', 'reload config');
