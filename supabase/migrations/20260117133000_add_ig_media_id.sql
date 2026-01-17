-- Add ig_media_id to scheduled_posts table to track published content for insights
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS ig_media_id TEXT;
