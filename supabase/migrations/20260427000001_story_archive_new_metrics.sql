-- Add Graph API v22+ metrics to story_archive.
-- Replaces the retired taps_forward / taps_back / exits set with the
-- supported metric set (kept the legacy columns for historical data).

ALTER TABLE public.story_archive
    ADD COLUMN IF NOT EXISTS total_interactions integer,
    ADD COLUMN IF NOT EXISTS shares integer;
