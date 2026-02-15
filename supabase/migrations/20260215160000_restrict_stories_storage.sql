-- Restrict stories storage bucket to service_role only for writes
-- Public reads remain for serving media URLs
-- This prevents unauthenticated uploads via the anon key

-- 1. Drop existing permissive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Public Stories Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Stories Update" ON storage.objects;

-- 2. Create service_role-only INSERT policy
CREATE POLICY "Service Role Stories Upload"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK ( bucket_id = 'stories' );

-- 3. Create service_role-only UPDATE policy
CREATE POLICY "Service Role Stories Update"
ON storage.objects FOR UPDATE
TO service_role
USING ( bucket_id = 'stories' );

-- 4. Add service_role-only DELETE policy (was missing entirely)
CREATE POLICY "Service Role Stories Delete"
ON storage.objects FOR DELETE
TO service_role
USING ( bucket_id = 'stories' );
