-- Migration: Add video processing optimization columns
-- Purpose: Eliminate redundant processing + add Railway UI feedback
-- Issue: INS-58

-- ============== ADD STORY READINESS TRACKING ==============

-- Add story_ready flag to track if video is already processed for Instagram Stories format
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS story_ready boolean DEFAULT false;

COMMENT ON COLUMN public.content_items.story_ready IS 'Whether video has been processed and is ready for Instagram Stories publishing (eliminates redundant processing at publish time)';

-- ============== ADD RAILWAY PROCESSING STATUS TRACKING ==============

-- Add processing status field (tracks Railway processing lifecycle)
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending';

COMMENT ON COLUMN public.content_items.processing_status IS 'Processing status: pending | processing | completed | failed';

-- Add processing completion timestamp
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS processing_completed_at timestamp with time zone;

COMMENT ON COLUMN public.content_items.processing_completed_at IS 'Timestamp when Railway processing completed (success or failure)';

-- Add processing error message
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS processing_error text;

COMMENT ON COLUMN public.content_items.processing_error IS 'Error message if Railway processing failed';

-- Add processing backend identifier
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS processing_backend text;

COMMENT ON COLUMN public.content_items.processing_backend IS 'Backend used for processing: browser | railway | server-ffmpeg | none';

-- Add processing transformations applied
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS processing_applied jsonb;

COMMENT ON COLUMN public.content_items.processing_applied IS 'Array of transformations applied during processing (e.g., ["h264-encoding", "resize", "thumbnail-extraction"])';

-- ============== CREATE INDEXES ==============

-- Index for finding videos ready for instant publishing
CREATE INDEX IF NOT EXISTS idx_content_items_story_ready
ON public.content_items(story_ready, media_type)
WHERE story_ready = true AND media_type = 'VIDEO';

-- Index for finding videos currently being processed
CREATE INDEX IF NOT EXISTS idx_content_items_processing_status
ON public.content_items(processing_status, processing_started_at)
WHERE processing_status IN ('processing', 'failed');

-- Index for Railway processing queries (completion time tracking)
CREATE INDEX IF NOT EXISTS idx_content_items_processing_backend
ON public.content_items(processing_backend, processing_status)
WHERE processing_backend = 'railway';

-- ============== LOG MIGRATION ==============

DO $$
BEGIN
  RAISE NOTICE 'Migration: Video processing optimization columns added successfully';
  RAISE NOTICE '  - story_ready: Tracks if video is ready for Instagram Stories';
  RAISE NOTICE '  - processing_status: Tracks Railway processing lifecycle (pending/processing/completed/failed)';
  RAISE NOTICE '  - processing_completed_at: Completion timestamp';
  RAISE NOTICE '  - processing_error: Error message for failed processing';
  RAISE NOTICE '  - processing_backend: Backend used (browser/railway/server-ffmpeg/none)';
  RAISE NOTICE '  - processing_applied: Array of transformations applied';
  RAISE NOTICE '  - Indexes created for story_ready, processing_status, and processing_backend queries';
  RAISE NOTICE 'Expected Impact:';
  RAISE NOTICE '  - Before: 5-15 seconds delay at publish time (redundant processing)';
  RAISE NOTICE '  - After: <2 seconds at publish time (instant publishing)';
  RAISE NOTICE '  - Savings: 3-13 seconds per scheduled post';
END $$;
