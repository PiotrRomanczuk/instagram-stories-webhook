-- Super-permissive storage policies for the 'stories' bucket to fix RLS errors.

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing policies on objects to avoid conflicts (and potential misconfigurations)
-- We handle potential errors if policies don't exist by just trying to create new ones (or ignore if name collision isn't allowed, but dropping is safer)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Stories Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Stories Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Stories Update" ON storage.objects;
DROP POLICY IF EXISTS "Give me access" ON storage.objects;

-- 3. Create comprehensive policies for 'stories' bucket

-- Allow SELECT (viewing) for everyone (anon + authenticated)
CREATE POLICY "Public Stories Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'stories' );

-- Allow INSERT (uploading) for everyone
CREATE POLICY "Public Stories Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'stories' );

-- Allow UPDATE just in case (e.g. overwriting)
CREATE POLICY "Public Stories Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'stories' );

-- 4. Ensure Buckets are visible (sometimes required for the client to verify bucket existence)
DROP POLICY IF EXISTS "Public Buckets Select" ON storage.buckets;
CREATE POLICY "Public Buckets Select"
ON storage.buckets FOR SELECT
USING ( true );
