-- Add user_email column to scheduled_posts table
-- This allows proper tracking of the original submitter's email

-- Add user_email column
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Create index for querying by user_email
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_email ON public.scheduled_posts(user_email);

-- Backfill user_email from next_auth.users for existing records
UPDATE public.scheduled_posts sp
SET user_email = u.email
FROM next_auth.users u
WHERE sp.user_id = u.id::text
  AND sp.user_email IS NULL
  AND u.email IS NOT NULL;

-- Also fix content_items where user_email is a UUID
-- by looking up from next_auth.users table
UPDATE public.content_items ci
SET user_email = u.email
FROM next_auth.users u
WHERE ci.user_id = u.id::text
  AND u.email IS NOT NULL
  AND (
    -- Match UUIDs (user_email looks like a UUID)
    ci.user_email ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR ci.user_email IS NULL
    OR ci.user_email = ''
    OR ci.user_email = 'unknown@example.com'
  );

-- Log the fix
DO $$
DECLARE
  fixed_sp_count INTEGER;
  fixed_ci_count INTEGER;
  remaining_uuid_count INTEGER;
BEGIN
  -- Count scheduled_posts with email now set
  SELECT COUNT(*) INTO fixed_sp_count
  FROM public.scheduled_posts
  WHERE user_email IS NOT NULL;

  -- Count content_items still with UUID as user_email
  SELECT COUNT(*) INTO remaining_uuid_count
  FROM public.content_items
  WHERE user_email ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  - Scheduled posts with user_email: %', fixed_sp_count;
  RAISE NOTICE '  - Content items still with UUID as user_email: %', remaining_uuid_count;

  IF remaining_uuid_count > 0 THEN
    RAISE NOTICE 'Warning: Some content items still have UUID as user_email. These users may not exist in next_auth.users.';
  END IF;
END $$;
