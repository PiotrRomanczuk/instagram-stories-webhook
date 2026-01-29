-- Migration: Instagram Direct Messaging Support
-- Enables receiving, storing, and sending Instagram DMs via Meta's Messenger Platform

-- 1. Create instagram_conversations table
CREATE TABLE IF NOT EXISTS public.instagram_conversations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,                              -- References next_auth.users(id)
    ig_conversation_id text NOT NULL UNIQUE,            -- Instagram's conversation ID from API
    participant_ig_id text NOT NULL,                    -- Instagram user ID of the other person
    participant_username text,                          -- Their Instagram username (for display)
    participant_profile_pic text,                       -- Profile picture URL
    last_message_text text,                             -- Preview of last message
    last_message_at timestamp with time zone,           -- When last message was sent/received
    unread_count int DEFAULT 0,                         -- Number of unread messages
    is_active boolean DEFAULT true,                     -- Conversation is active (not archived)
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    PRIMARY KEY (id),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES next_auth.users(id) ON DELETE CASCADE
);

-- 2. Create instagram_messages table
CREATE TABLE IF NOT EXISTS public.instagram_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL,                      -- References instagram_conversations(id)
    ig_message_id text NOT NULL UNIQUE,                 -- Instagram's message ID from API
    sender_ig_id text NOT NULL,                         -- Instagram ID of sender
    recipient_ig_id text NOT NULL,                      -- Instagram ID of recipient
    message_text text,                                  -- Message content (null if only attachments)
    message_type text DEFAULT 'text',                   -- 'text', 'image', 'video', 'story_reply'
    attachments jsonb,                                  -- Array of attachment objects {type, url}
    is_from_user boolean NOT NULL,                      -- true = from our account, false = from customer
    ig_created_time bigint,                             -- Unix timestamp from Instagram API
    created_at timestamp with time zone DEFAULT now(),  -- When we received/sent it

    PRIMARY KEY (id),
    CONSTRAINT fk_conversation FOREIGN KEY (conversation_id) REFERENCES public.instagram_conversations(id) ON DELETE CASCADE
);

-- 3. Create message_templates table (for quick replies and automation)
CREATE TABLE IF NOT EXISTS public.message_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,                              -- References next_auth.users(id)
    name text NOT NULL,                                 -- Template name (e.g., "Welcome Message")
    template_text text NOT NULL,                        -- Message content with optional variables
    trigger_keywords text[],                            -- Auto-reply triggers (e.g., ['hi', 'hello'])
    is_active boolean DEFAULT true,                     -- Template is active for auto-replies
    usage_count int DEFAULT 0,                          -- Track how many times used
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    PRIMARY KEY (id),
    CONSTRAINT fk_user_template FOREIGN KEY (user_id) REFERENCES next_auth.users(id) ON DELETE CASCADE
);

-- 4. Create indexes for performance
CREATE INDEX idx_conversations_user_id ON public.instagram_conversations(user_id);
CREATE INDEX idx_conversations_ig_id ON public.instagram_conversations(ig_conversation_id);
CREATE INDEX idx_conversations_last_message ON public.instagram_conversations(user_id, last_message_at DESC);
CREATE INDEX idx_messages_conversation ON public.instagram_messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_ig_id ON public.instagram_messages(ig_message_id);
CREATE INDEX idx_templates_user ON public.message_templates(user_id);

-- 5. Enable Row Level Security
ALTER TABLE public.instagram_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for instagram_conversations
-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
    ON public.instagram_conversations
    FOR SELECT
    USING (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- Users can insert their own conversations (when webhook creates them)
CREATE POLICY "Users can insert own conversations"
    ON public.instagram_conversations
    FOR INSERT
    WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
    ON public.instagram_conversations
    FOR UPDATE
    USING (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid)
    WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- Service role has full access
CREATE POLICY "Service role has full access to conversations"
    ON public.instagram_conversations
    FOR ALL
    USING (auth.role() = 'service_role');

-- 7. RLS Policies for instagram_messages
-- Users can view messages from their conversations
CREATE POLICY "Users can view messages from own conversations"
    ON public.instagram_messages
    FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM public.instagram_conversations
            WHERE user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
        )
    );

-- Users can insert messages (when sending)
CREATE POLICY "Users can insert messages to own conversations"
    ON public.instagram_messages
    FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM public.instagram_conversations
            WHERE user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
        )
    );

-- Service role has full access
CREATE POLICY "Service role has full access to messages"
    ON public.instagram_messages
    FOR ALL
    USING (auth.role() = 'service_role');

-- 8. RLS Policies for message_templates
-- Users can manage their own templates
CREATE POLICY "Users can manage own templates"
    ON public.message_templates
    FOR ALL
    USING (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid)
    WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- Service role has full access
CREATE POLICY "Service role has full access to templates"
    ON public.message_templates
    FOR ALL
    USING (auth.role() = 'service_role');

-- 9. Create function to update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.instagram_conversations
    SET
        updated_at = now(),
        last_message_text = NEW.message_text,
        last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to auto-update conversation on new message
CREATE TRIGGER trigger_update_conversation_on_message
    AFTER INSERT ON public.instagram_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- 11. Grant permissions
GRANT ALL ON public.instagram_conversations TO service_role;
GRANT ALL ON public.instagram_messages TO service_role;
GRANT ALL ON public.message_templates TO service_role;

-- 12. Add comments for documentation
COMMENT ON TABLE public.instagram_conversations IS 'Instagram DM conversations via Meta Messenger Platform';
COMMENT ON TABLE public.instagram_messages IS 'Individual messages within Instagram conversations';
COMMENT ON TABLE public.message_templates IS 'Reusable message templates for quick replies and automation';
COMMENT ON COLUMN public.instagram_messages.is_from_user IS 'true = sent by our business account, false = received from customer';
COMMENT ON COLUMN public.instagram_conversations.ig_conversation_id IS 'Unique conversation ID from Instagram Messaging API';
