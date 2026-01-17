-- Migration: Add user_tags to scheduled_posts
-- This allows storing tagged users for Instagram Stories and Posts

ALTER TABLE public.scheduled_posts 
ADD COLUMN IF NOT EXISTS user_tags JSONB DEFAULT '[]'::jsonb;

-- No new policies needed as the existing ones cover the table
