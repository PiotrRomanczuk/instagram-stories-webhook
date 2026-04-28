-- Extend linked_accounts to support TikTok (open_id stored in platform_user_id)

ALTER TABLE public.linked_accounts
ADD COLUMN IF NOT EXISTS platform_user_id text;

COMMENT ON COLUMN public.linked_accounts.platform_user_id
    IS 'Platform-specific user ID (e.g., TikTok open_id). Distinct from provider_account_id.';
