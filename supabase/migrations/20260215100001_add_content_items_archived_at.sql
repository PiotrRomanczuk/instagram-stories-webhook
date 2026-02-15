-- Add archived_at column to content_items (referenced in code but missing from schema)
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_content_items_archived
    ON public.content_items(archived_at)
    WHERE archived_at IS NOT NULL;
