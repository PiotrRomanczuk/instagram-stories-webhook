-- TikTok-via-phone-automation channel for content_items
--
-- Adds a publishing_channel discriminator so the existing IG cron batch
-- skips rows destined for the phone worker. The phone worker (separate
-- Python process) reads its own pending queue.
--
-- Channel values:
--   'instagram'     — Meta Graph API (existing default)
--   'tiktok-device' — Samsung S24 / uiautomator2 (new)
--
-- 'tiktok-api' (official Content Posting API) intentionally NOT added
-- here — that path doesn't flow through content_items.

-- 1. publishing_channel on content_items
ALTER TABLE public.content_items
    ADD COLUMN IF NOT EXISTS publishing_channel text
        NOT NULL DEFAULT 'instagram'
        CHECK (publishing_channel IN ('instagram', 'tiktok-device'));

ALTER TABLE public.content_items
    ADD COLUMN IF NOT EXISTS tiktok_post_id text;

CREATE INDEX IF NOT EXISTS idx_content_items_channel_status_time
    ON public.content_items (publishing_channel, publishing_status, scheduled_time)
    WHERE publishing_status = 'scheduled';

COMMENT ON COLUMN public.content_items.publishing_channel
    IS 'Which publishing pipeline owns this row. IG cron only picks instagram rows; phone worker only picks tiktok-device rows.';

COMMENT ON COLUMN public.content_items.tiktok_post_id
    IS 'TikTok post id captured after a successful phone-driven publish (parallel to ig_media_id).';

-- 2. Channel column on audit/quota tables
ALTER TABLE public.publishing_logs
    ADD COLUMN IF NOT EXISTS publishing_channel text NOT NULL DEFAULT 'instagram';

ALTER TABLE public.api_quota_history
    ADD COLUMN IF NOT EXISTS publishing_channel text NOT NULL DEFAULT 'instagram';

-- 3. tiktok_devices: one row per physical phone
CREATE TABLE IF NOT EXISTS public.tiktok_devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    device_serial text NOT NULL,
    phone_label text NOT NULL,
    tiktok_username text NOT NULL,
    status text NOT NULL DEFAULT 'offline'
        CHECK (status IN ('online', 'offline', 'login_required', 'banned')),
    last_heartbeat_at timestamptz,
    behaviour_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
    daily_post_cap integer NOT NULL DEFAULT 10
        CHECK (daily_post_cap > 0 AND daily_post_cap <= 100),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, device_serial)
);

CREATE INDEX IF NOT EXISTS idx_tiktok_devices_status
    ON public.tiktok_devices (status, last_heartbeat_at);

CREATE INDEX IF NOT EXISTS idx_tiktok_devices_user
    ON public.tiktok_devices (user_id);

COMMENT ON TABLE public.tiktok_devices
    IS 'Physical phones registered as TikTok Story publishers. Worker on the host writes heartbeats here; /api/cron/tiktok-health marks stale rows offline.';

COMMENT ON COLUMN public.tiktok_devices.behaviour_profile
    IS 'Per-device humanisation personality: thumb-offset bias, scroll-velocity range, like/comment-peek rates, diurnal-peak shifts. Drifts slowly across weeks.';

COMMENT ON COLUMN public.tiktok_devices.daily_post_cap
    IS 'Synthetic quota: max posts this device may publish in any rolling 24h window. Enforced by the worker.';

-- 4. RLS for tiktok_devices (mirror linked_accounts: owner + service role)
ALTER TABLE public.tiktok_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tiktok_devices_owner_select ON public.tiktok_devices;
CREATE POLICY tiktok_devices_owner_select
    ON public.tiktok_devices
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS tiktok_devices_owner_modify ON public.tiktok_devices;
CREATE POLICY tiktok_devices_owner_modify
    ON public.tiktok_devices
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Service role bypasses RLS by default in Supabase; no explicit policy needed
-- for the worker (it connects with the service key).

-- 5. updated_at trigger
CREATE OR REPLACE FUNCTION public.tiktok_devices_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tiktok_devices_touch_updated_at ON public.tiktok_devices;
CREATE TRIGGER trg_tiktok_devices_touch_updated_at
    BEFORE UPDATE ON public.tiktok_devices
    FOR EACH ROW EXECUTE FUNCTION public.tiktok_devices_touch_updated_at();
