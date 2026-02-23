-- Security hardening: explicit service_role-only access on admin_audit_log and auth_events.
--
-- Both tables were created with RLS enabled but without any explicit GRANT/REVOKE
-- statements for the authenticated role.  In Supabase the authenticated role inherits
-- default schema privileges, so an over-privileged GRANT somewhere else (or a future
-- schema reset) could expose these tables to direct client access.
--
-- This migration makes the intent unambiguous:
--   - REVOKE all direct privileges from authenticated on both tables.
--   - Grant only the minimum required to service_role (INSERT for append-only audit trails).
--   - service_role bypasses RLS by design, so no explicit RLS policy is needed for it.
--   - No SELECT/UPDATE/DELETE policy is created for authenticated, meaning client-side
--     requests will always receive an empty result set (RLS default-deny).

-- ---------------------------------------------------------------------------
-- admin_audit_log
-- ---------------------------------------------------------------------------

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop any pre-existing policies that might grant authenticated access
DROP POLICY IF EXISTS "admin_audit_log_select" ON admin_audit_log;
DROP POLICY IF EXISTS "admin_audit_log_insert" ON admin_audit_log;
DROP POLICY IF EXISTS "admin_audit_log_all"    ON admin_audit_log;

-- Revoke all direct privileges from authenticated role
REVOKE ALL ON admin_audit_log FROM authenticated;

-- Ensure service_role retains full access (implicit via RLS bypass, explicit here for clarity)
GRANT INSERT ON admin_audit_log TO service_role;

-- ---------------------------------------------------------------------------
-- auth_events
-- ---------------------------------------------------------------------------

ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;

-- Drop any pre-existing policies that might grant authenticated access
DROP POLICY IF EXISTS "auth_events_select" ON auth_events;
DROP POLICY IF EXISTS "auth_events_insert" ON auth_events;
DROP POLICY IF EXISTS "auth_events_all"    ON auth_events;

-- Revoke all direct privileges from authenticated role
REVOKE ALL ON auth_events FROM authenticated;

-- Ensure service_role retains full access
GRANT INSERT ON auth_events TO service_role;
