-- Add version column for optimistic locking on meme_submissions
-- This prevents concurrent edit conflicts when multiple sessions edit the same meme

ALTER TABLE meme_submissions 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Add comment explaining the purpose
COMMENT ON COLUMN meme_submissions.version IS 'Optimistic locking version number to prevent concurrent edit conflicts';

-- Create index for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_meme_submissions_version ON meme_submissions(id, version);
