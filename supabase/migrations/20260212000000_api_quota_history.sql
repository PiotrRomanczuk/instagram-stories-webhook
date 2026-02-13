-- API Quota History table for tracking Meta publishing quota consumption
-- Records snapshots at the start and end of each cron run for debugging

CREATE TABLE IF NOT EXISTS api_quota_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    ig_user_id text NOT NULL,
    quota_total integer,
    quota_usage integer,
    quota_duration integer,
    cron_run_id text,
    snapshot_type text,
    posts_attempted integer,
    posts_succeeded integer,
    posts_failed integer,
    posts_skipped_quota integer,
    max_posts_config integer,
    error_message text,
    recorded_at timestamptz DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_quota_history_user_id ON api_quota_history (user_id);
CREATE INDEX IF NOT EXISTS idx_quota_history_recorded_at ON api_quota_history (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_quota_history_cron_run_id ON api_quota_history (cron_run_id);

-- RLS: service_role only (no user access needed)
ALTER TABLE api_quota_history ENABLE ROW LEVEL SECURITY;
