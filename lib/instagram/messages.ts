import axios from 'axios';
import { getFacebookAccessToken, getInstagramUserId } from '@/lib/database/linked-accounts';
import { Logger } from '@/lib/utils/logger';
import { withRetry } from '@/lib/utils/retry';
import type {
    SendMessageRequest,
    SendMessageResponse,
    InstagramConversationAPI,
    InstagramMessageAPI,
} from '@/lib/types/messaging';

const GRAPH_API_BASE = 'https://graph.facebook.com/v24.0';
const MODULE = 'instagram-messages';

/**
 * Determines if an Instagram Messaging API error should be retried.
 */
function isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const fbErrorCode = error.response?.data?.error?.code;

        // Retry on Server Errors (5xx)
        if (statusCode && statusCode >= 500) return true;

        // Retry on Rate Limiting (429 or FB Error Code 17, 32, 613)
        if (statusCode === 429 || [17, 32, 613].includes(fbErrorCode)) return true;

        // Retry on specific transient errors
        if ([1, 2].includes(fbErrorCode)) return true;
    }
    return false;
}

/**
 * Get all conversations for an Instagram Business Account
 *
 * @param userId - The user ID from next_auth.users
 * @param limit - Maximum number of conversations to return (default: 25)
 * @returns Array of conversation objects from Instagram API
 */
export async function getConversations(
    userId: string,
    limit: number = 25
): Promise<InstagramConversationAPI[]> {
    const accessToken = await getFacebookAccessToken(userId);
    if (!accessToken) {
        throw new Error(`No active Facebook connection found for user ${userId}`);
    }

    const igUserId = await getInstagramUserId(userId);
    if (!igUserId) {
        throw new Error(`No Instagram Business Account found for user ${userId}`);
    }

    await Logger.info(MODULE, `📬 Fetching conversations for IG user ${igUserId}`, { userId });

    const url = `${GRAPH_API_BASE}/${igUserId}/conversations`;
    const params = {
        access_token: accessToken,
        platform: 'instagram',
        fields: 'id,updated_time,participants',
        limit: limit.toString(),
    };

    const fetchConversations = async () => {
        try {
            const response = await axios.get<{ data: InstagramConversationAPI[] }>(url, { params });
            await Logger.info(MODULE, `✅ Retrieved ${response.data.data.length} conversations`, { userId });
            return response.data.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMsg = error.response?.data?.error?.message || error.message;
                const errorCode = error.response?.data?.error?.code;
                await Logger.error(MODULE, `❌ Failed to fetch conversations: ${errorMsg}`, {
                    userId,
                    errorCode,
                    status: error.response?.status,
                });
            }
            throw error;
        }
    };

    return withRetry(fetchConversations, {
        maxAttempts: 3,
        initialDelayMs: 1000,
        retryableErrors: isRetryableError,
    });
}

/**
 * Get messages from a specific conversation
 *
 * @param conversationId - The Instagram conversation ID
 * @param userId - The user ID from next_auth.users
 * @param limit - Maximum number of messages to return (default: 50)
 * @returns Array of message objects from Instagram API
 */
export async function getConversationMessages(
    conversationId: string,
    userId: string,
    limit: number = 50
): Promise<InstagramMessageAPI[]> {
    const accessToken = await getFacebookAccessToken(userId);
    if (!accessToken) {
        throw new Error(`No active Facebook connection found for user ${userId}`);
    }

    await Logger.info(MODULE, `📨 Fetching messages for conversation ${conversationId}`, { userId });

    const url = `${GRAPH_API_BASE}/${conversationId}`;
    const params = {
        access_token: accessToken,
        fields: 'messages{id,created_time,from,to,message,attachments}',
        limit: limit.toString(),
    };

    const fetchMessages = async () => {
        try {
            const response = await axios.get<{
                messages: { data: InstagramMessageAPI[] };
            }>(url, { params });

            const messages = response.data.messages?.data || [];
            await Logger.info(MODULE, `✅ Retrieved ${messages.length} messages`, {
                userId,
                conversationId,
            });
            return messages;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMsg = error.response?.data?.error?.message || error.message;
                const errorCode = error.response?.data?.error?.code;
                await Logger.error(MODULE, `❌ Failed to fetch messages: ${errorMsg}`, {
                    userId,
                    conversationId,
                    errorCode,
                    status: error.response?.status,
                });
            }
            throw error;
        }
    };

    return withRetry(fetchMessages, {
        maxAttempts: 3,
        initialDelayMs: 1000,
        retryableErrors: isRetryableError,
    });
}

/**
 * Send a message to an Instagram user
 *
 * Rate Limit: 200 messages per hour (as of 2026)
 * Important: Users must initiate the conversation first
 *
 * @param recipientIgId - Instagram-scoped ID (IGSID) of the recipient
 * @param messageText - Text content of the message
 * @param userId - The user ID from next_auth.users (sender)
 * @returns Response with recipient_id and message_id
 */
export async function sendMessage(
    recipientIgId: string,
    messageText: string,
    userId: string
): Promise<SendMessageResponse> {
    const accessToken = await getFacebookAccessToken(userId);
    if (!accessToken) {
        throw new Error(`No active Facebook connection found for user ${userId}`);
    }

    const igUserId = await getInstagramUserId(userId);
    if (!igUserId) {
        throw new Error(`No Instagram Business Account found for user ${userId}`);
    }

    await Logger.info(MODULE, `📤 Sending message to ${recipientIgId}`, {
        userId,
        messageLength: messageText.length,
    });

    // Validate message length (Instagram limit: 1000 characters)
    if (messageText.length > 1000) {
        throw new Error('Message text cannot exceed 1000 characters');
    }

    const url = `${GRAPH_API_BASE}/${igUserId}/messages`;
    const payload: SendMessageRequest = {
        recipient: { id: recipientIgId },
        message: { text: messageText },
        messaging_type: 'RESPONSE', // Responding to user-initiated conversation
    };

    const sendMessageRequest = async () => {
        try {
            const response = await axios.post<SendMessageResponse>(url, payload, {
                params: { access_token: accessToken },
            });

            await Logger.info(MODULE, `✅ Message sent successfully`, {
                userId,
                messageId: response.data.message_id,
                recipientId: response.data.recipient_id,
            });

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMsg = error.response?.data?.error?.message || error.message;
                const errorCode = error.response?.data?.error?.code;
                const errorType = error.response?.data?.error?.type;

                await Logger.error(MODULE, `❌ Failed to send message: ${errorMsg}`, {
                    userId,
                    recipientIgId,
                    errorCode,
                    errorType,
                    status: error.response?.status,
                });

                // Handle specific error cases
                if (errorCode === 10) {
                    throw new Error('Permission denied. Ensure instagram_manage_messages permission is granted.');
                } else if (errorCode === 100) {
                    throw new Error('Invalid recipient or message format.');
                } else if (errorCode === 368) {
                    throw new Error('Messaging rate limit exceeded (200 messages/hour). Please try again later.');
                } else if (errorCode === 551) {
                    throw new Error('User is not eligible to receive messages. They may need to initiate the conversation first.');
                }
            }
            throw error;
        }
    };

    return withRetry(sendMessageRequest, {
        maxAttempts: 2,
        initialDelayMs: 2000,
        retryableErrors: isRetryableError,
    });
}

/**
 * Send a message with an image attachment
 *
 * @param recipientIgId - Instagram-scoped ID (IGSID) of the recipient
 * @param imageUrl - Public URL of the image to send
 * @param userId - The user ID from next_auth.users (sender)
 * @returns Response with recipient_id and message_id
 */
export async function sendImageMessage(
    recipientIgId: string,
    imageUrl: string,
    userId: string
): Promise<SendMessageResponse> {
    const accessToken = await getFacebookAccessToken(userId);
    if (!accessToken) {
        throw new Error(`No active Facebook connection found for user ${userId}`);
    }

    const igUserId = await getInstagramUserId(userId);
    if (!igUserId) {
        throw new Error(`No Instagram Business Account found for user ${userId}`);
    }

    await Logger.info(MODULE, `📸 Sending image message to ${recipientIgId}`, { userId, imageUrl });

    const url = `${GRAPH_API_BASE}/${igUserId}/messages`;
    const payload: SendMessageRequest = {
        recipient: { id: recipientIgId },
        message: {
            attachment: {
                type: 'image',
                payload: {
                    url: imageUrl,
                    is_reusable: true,
                },
            },
        },
        messaging_type: 'RESPONSE',
    };

    const sendImageRequest = async () => {
        try {
            const response = await axios.post<SendMessageResponse>(url, payload, {
                params: { access_token: accessToken },
            });

            await Logger.info(MODULE, `✅ Image message sent successfully`, {
                userId,
                messageId: response.data.message_id,
            });

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMsg = error.response?.data?.error?.message || error.message;
                await Logger.error(MODULE, `❌ Failed to send image: ${errorMsg}`, { userId });
            }
            throw error;
        }
    };

    return withRetry(sendImageRequest, {
        maxAttempts: 2,
        initialDelayMs: 2000,
        retryableErrors: isRetryableError,
    });
}

/**
 * Mark a conversation as read (if supported by API)
 * Note: This may require additional permissions
 *
 * @param conversationId - The Instagram conversation ID
 * @param userId - The user ID from next_auth.users
 */
export async function markConversationAsRead(
    conversationId: string,
    userId: string
): Promise<boolean> {
    const accessToken = await getFacebookAccessToken(userId);
    if (!accessToken) {
        throw new Error(`No active Facebook connection found for user ${userId}`);
    }

    await Logger.info(MODULE, `✓ Marking conversation ${conversationId} as read`, { userId });

    // Note: The exact endpoint for marking as read may vary
    // This is a placeholder implementation
    const url = `${GRAPH_API_BASE}/${conversationId}`;

    try {
        await axios.post(
            url,
            { read: true },
            { params: { access_token: accessToken } }
        );

        await Logger.info(MODULE, `✅ Conversation marked as read`, { userId, conversationId });
        return true;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            await Logger.warn(MODULE, `⚠️ Could not mark as read: ${errorMsg}`, {
                userId,
                conversationId,
            });
        }
        return false;
    }
}
