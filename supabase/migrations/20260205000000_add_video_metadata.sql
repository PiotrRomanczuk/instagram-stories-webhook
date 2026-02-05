-- Migration: Add video-specific metadata fields to content_items
-- Adds thumbnail support and video processing tracking

-- ============== ADD VIDEO METADATA FIELDS ==============

-- Add thumbnail_url for video thumbnail previews
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add video duration in seconds
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS video_duration integer;

-- Add video codec (e.g., 'h264', 'vp9')
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS video_codec text;

-- Add video framerate (e.g., 30.0, 29.97)
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS video_framerate numeric(5, 2);

-- Add flag for videos needing processing
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS needs_processing boolean DEFAULT false;

-- ============== CREATE INDEXES ==============

-- Index for filtering videos needing processing
CREATE INDEX IF NOT EXISTS idx_content_items_needs_processing
ON public.content_items(needs_processing)
WHERE needs_processing = true;

-- Index for video-specific queries
CREATE INDEX IF NOT EXISTS idx_content_items_video_metadata
ON public.content_items(media_type, video_duration)
WHERE media_type = 'VIDEO';

-- ============== ADD COMMENTS ==============

COMMENT ON COLUMN public.content_items.thumbnail_url IS 'URL to video thumbnail image (extracted frame)';
COMMENT ON COLUMN public.content_items.video_duration IS 'Video duration in seconds';
COMMENT ON COLUMN public.content_items.video_codec IS 'Video codec (e.g., h264, vp9, hevc)';
COMMENT ON COLUMN public.content_items.video_framerate IS 'Video frame rate (e.g., 30.0, 29.97)';
COMMENT ON COLUMN public.content_items.needs_processing IS 'Flag indicating if video needs conversion to Instagram specs';

-- ============== LOG MIGRATION ==============

DO $$
BEGIN
  RAISE NOTICE 'Migration: Video metadata fields added successfully';
  RAISE NOTICE '  - thumbnail_url: URL to extracted video thumbnail';
  RAISE NOTICE '  - video_duration: Duration in seconds';
  RAISE NOTICE '  - video_codec: Codec name';
  RAISE NOTICE '  - video_framerate: Frame rate';
  RAISE NOTICE '  - needs_processing: Processing flag';
  RAISE NOTICE '  - Indexes created for needs_processing and video queries';
END $$;
