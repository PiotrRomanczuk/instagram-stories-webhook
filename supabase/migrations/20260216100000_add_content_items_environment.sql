-- Migration: Add environment column to content_items
-- Isolates E2E test data (preview deployments) from production data.
-- Each Vercel deployment tags items with its VERCEL_ENV value.

-- Add column with default 'production' so all existing rows are tagged correctly
ALTER TABLE public.content_items
    ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production';

-- Composite indexes for environment-scoped queries
CREATE INDEX IF NOT EXISTS idx_content_items_env_publishing
    ON public.content_items(environment, publishing_status);

CREATE INDEX IF NOT EXISTS idx_content_items_env_scheduled
    ON public.content_items(environment, publishing_status, scheduled_time)
    WHERE publishing_status IN ('scheduled', 'processing');

CREATE INDEX IF NOT EXISTS idx_content_items_env_review
    ON public.content_items(environment, source, submission_status)
    WHERE source = 'submission' AND submission_status = 'pending';

COMMENT ON COLUMN public.content_items.environment IS 'Deployment environment: production, preview, or development. Prevents E2E test data from appearing in production.';
