-- Create notifications table for in-app alerts
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    type text NOT NULL,  -- 'meme_approved', 'meme_rejected', 'meme_published', 'meme_scheduled'
    title text NOT NULL,
    message text,
    related_type text,   -- 'meme', 'post', etc.
    related_id uuid,     -- ID of the related entity
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications'
    ) THEN
        CREATE POLICY "Users can view own notifications"
            ON public.notifications FOR SELECT
            USING (user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update own notifications'
    ) THEN
        CREATE POLICY "Users can update own notifications"
            ON public.notifications FOR UPDATE
            USING (user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Service role manages notifications'
    ) THEN
        CREATE POLICY "Service role manages notifications"
            ON public.notifications FOR ALL
            USING (auth.role() = 'service_role');
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

COMMENT ON TABLE public.notifications IS 'In-app notifications for users regarding their meme submissions and account status';
