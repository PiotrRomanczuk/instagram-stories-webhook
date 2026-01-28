-- Add perceptual hash column to meme_submissions for duplicate detection
ALTER TABLE public.meme_submissions 
ADD COLUMN IF NOT EXISTS phash text;

-- Add index for efficient duplicate lookups
CREATE INDEX IF NOT EXISTS idx_meme_submissions_phash 
ON public.meme_submissions(phash) WHERE phash IS NOT NULL;

COMMENT ON COLUMN public.meme_submissions.phash IS 'Perceptual hash of the media (64-bit hex) for duplicate detection';
