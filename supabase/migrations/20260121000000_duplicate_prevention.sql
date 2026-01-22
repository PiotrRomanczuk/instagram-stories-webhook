-- Migration: Add duplicate prevention and processing lock columns
-- This prevents race conditions and duplicate posting

-- 1. Add columns to scheduled_posts for duplicate prevention
ALTER TABLE public.scheduled_posts 
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meme_id UUID;

-- 2. Add unique constraint on idempotency_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_posts_idempotency 
  ON public.scheduled_posts(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- 3. Index for fast duplicate lookup by content hash
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_content_hash 
  ON public.scheduled_posts(content_hash) 
  WHERE content_hash IS NOT NULL;

-- 4. Index for processing lock queries
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_processing 
  ON public.scheduled_posts(status, processing_started_at);

-- 5. Index for meme_id lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_meme_id 
  ON public.scheduled_posts(meme_id) 
  WHERE meme_id IS NOT NULL;

-- 6. Add foreign key to meme_submissions (optional, for referential integrity)
ALTER TABLE public.scheduled_posts
  ADD CONSTRAINT fk_scheduled_posts_meme
  FOREIGN KEY (meme_id) 
  REFERENCES public.meme_submissions(id)
  ON DELETE SET NULL;
