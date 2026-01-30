-- Fix content_items.user_email where it was incorrectly set to user_id (UUID)
-- This happened due to the backfill migration using user_id as fallback

-- Update user_email by joining with users table where user_email looks like a UUID
UPDATE public.content_items ci
SET user_email = u.email
FROM public.users u
WHERE ci.user_id = u.id::text
  AND u.email IS NOT NULL
  AND (
    -- Match UUIDs (user_email looks like a UUID)
    ci.user_email ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR ci.user_email IS NULL
    OR ci.user_email = ''
    OR ci.user_email = 'unknown@example.com'
  );

-- Also update any remaining records by trying to match user_id as UUID
UPDATE public.content_items ci
SET user_email = u.email
FROM public.users u
WHERE ci.user_id::uuid = u.id
  AND u.email IS NOT NULL
  AND (
    ci.user_email ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR ci.user_email IS NULL
    OR ci.user_email = ''
    OR ci.user_email = 'unknown@example.com'
  );

-- Log the fix
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM public.content_items
  WHERE user_email NOT LIKE '%@%'
    AND user_email ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  IF fixed_count > 0 THEN
    RAISE NOTICE 'Warning: % content items still have UUID as user_email', fixed_count;
  END IF;
END $$;
