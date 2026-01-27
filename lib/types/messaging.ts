/**
 * Type definitions for Instagram Direct Messaging
 * Based on Meta's Messenger Platform API for Instagram
 */

// ============================================================================
// Database Types (snake_case - matches Supabase schema)
// ============================================================================

export interface DbInstagramConversation {
    id: string;
    user_id: string;
    ig_conversation_id: string;
    participant_ig_id: string;
    participant_username: string | null;
    participant_profile_pic: string | null;
    last_message_text: string | null;
    last_message_at: string | null;
    unread_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface DbInstagramMessage {
    id: string;
    conversation_id: string;
    ig_message_id: string;
    sender_ig_id: string;
    recipient_ig_id: string;
    message_text: string | null;
    message_type: 'text' | 'image' | 'video' | 'story_reply';
    attachments: MessageAttachment[] | null;
    is_from_user: boolean;
    ig_created_time: number | null;
    created_at: string;
}

export interface DbMessageTemplate {
    id: string;
    user_id: string;
    name: string;
    template_text: string;
    trigger_keywords: string[] | null;
    is_active: boolean;
    usage_count: number;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// Application Types (camelCase - for TypeScript code)
// ============================================================================

export interface InstagramConversation {
    id: string;
    userId: string;
    igConversationId: string;
    participantIgId: string;
    participantUsername: string | null;
    participantProfilePic: string | null;
    lastMessageText: string | null;
    lastMessageAt: Date | null;
    unreadCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface InstagramMessage {
    id: string;
    conversationId: string;
    igMessageId: string;
    senderIgId: string;
    recipientIgId: string;
    messageText: string | null;
    messageType: 'text' | 'image' | 'video' | 'story_reply';
    attachments: MessageAttachment[] | null;
    isFromUser: boolean;
    igCreatedTime: number | null;
    createdAt: Date;
}

export interface MessageTemplate {
    id: string;
    userId: string;
    name: string;
    templateText: string;
    triggerKeywords: string[] | null;
    isActive: boolean;
    usageCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface MessageAttachment {
    type: 'image' | 'video' | 'audio' | 'file';
    url: string;
    mimeType?: string;
    size?: number;
}

// ============================================================================
// Instagram Messaging API Types (from Meta)
// ============================================================================

/**
 * Webhook event payload from Instagram when a message is received
 */
export interface InstagramWebhookEvent {
    object: 'instagram';
    entry: InstagramWebhookEntry[];
}

export interface InstagramWebhookEntry {
    id: string; // Instagram User ID (IGSID)
    time: number; // Unix timestamp
    messaging?: InstagramMessagingEvent[];
}

export interface InstagramMessagingEvent {
    sender: {
        id: string; // Instagram-scoped ID (IGSID)
    };
    recipient: {
        id: string; // Instagram-scoped ID (IGSID)
    };
    timestamp: number;
    message?: {
        mid: string; // Message ID
        text?: string;
        attachments?: Array<{
            type: 'image' | 'video' | 'audio' | 'file';
            payload: {
                url: string;
            };
        }>;
        is_echo?: boolean;
        reply_to?: {
            mid: string;
        };
    };
    postback?: {
        mid: string;
        title: string;
        payload: string;
    };
}

/**
 * Request payload for sending a message via Instagram Messaging API
 */
export interface SendMessageRequest {
    recipient: {
        id: string; // Instagram-scoped ID (IGSID)
    };
    message: {
        text?: string;
        attachment?: {
            type: 'image' | 'video' | 'audio' | 'file' | 'template';
            payload: {
                url?: string;
                is_reusable?: boolean;
            };
        };
    };
    messaging_type?: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG';
    tag?: string;
}

/**
 * Response from Instagram Messaging API when sending a message
 */
export interface SendMessageResponse {
    recipient_id: string;
    message_id: string;
}

/**
 * Instagram conversation from Graph API
 */
export interface InstagramConversationAPI {
    id: string;
    updated_time: string;
    participants: {
        data: Array<{
            id: string;
            username: string;
            profile_pic?: string;
        }>;
    };
    messages?: {
        data: InstagramMessageAPI[];
    };
}

/**
 * Instagram message from Graph API
 */
export interface InstagramMessageAPI {
    id: string;
    created_time: string;
    from: {
        id: string;
        username: string;
    };
    to: {
        data: Array<{
            id: string;
            username: string;
        }>;
    };
    message: string;
    attachments?: {
        data: Array<{
            id: string;
            image_data?: {
                url: string;
                width: number;
                height: number;
            };
            video_data?: {
                url: string;
                width: number;
                height: number;
            };
        }>;
    };
}

// ============================================================================
// Mapping Functions (Database <-> Application Types)
// ============================================================================

export function mapConversationRow(row: DbInstagramConversation): InstagramConversation {
    return {
        id: row.id,
        userId: row.user_id,
        igConversationId: row.ig_conversation_id,
        participantIgId: row.participant_ig_id,
        participantUsername: row.participant_username,
        participantProfilePic: row.participant_profile_pic,
        lastMessageText: row.last_message_text,
        lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
        unreadCount: row.unread_count,
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export function mapMessageRow(row: DbInstagramMessage): InstagramMessage {
    return {
        id: row.id,
        conversationId: row.conversation_id,
        igMessageId: row.ig_message_id,
        senderIgId: row.sender_ig_id,
        recipientIgId: row.recipient_ig_id,
        messageText: row.message_text,
        messageType: row.message_type,
        attachments: row.attachments,
        isFromUser: row.is_from_user,
        igCreatedTime: row.ig_created_time,
        createdAt: new Date(row.created_at),
    };
}

export function mapTemplateRow(row: DbMessageTemplate): MessageTemplate {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        templateText: row.template_text,
        triggerKeywords: row.trigger_keywords,
        isActive: row.is_active,
        usageCount: row.usage_count,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}
