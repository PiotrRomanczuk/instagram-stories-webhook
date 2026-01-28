-- Migration: Add ig_username to linked_accounts
-- For better presentation of linked accounts in the admin panel

ALTER TABLE public.linked_accounts 
ADD COLUMN IF NOT EXISTS ig_username text;

COMMENT ON COLUMN public.linked_accounts.ig_username IS 'Cached Instagram username for display purposes';
