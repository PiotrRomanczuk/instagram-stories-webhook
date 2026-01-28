import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { sendMessage, sendImageMessage } from '@/lib/instagram/messages';
import { Logger } from '@/lib/utils/logger';
import { z } from 'zod';
import type { DbInstagramConversation } from '@/lib/types/messaging';

const MODULE = 'api-messages-send';

// Validation schema for sending messages
const sendMessageSchema = z.object({
    conversationId: z.string().uuid('Invalid conversation ID'),
    messageText: z.string().min(1).max(1000, 'Message cannot exceed 1000 characters').optional(),
    imageUrl: z.string().url('Invalid image URL').optional(),
    messageType: z.enum(['text', 'image']).default('text'),
}).refine(
    (data) => {
        // Either messageText or imageUrl must be provided
        return (data.messageType === 'text' && data.messageText) ||
               (data.messageType === 'image' && data.imageUrl);
    },
    {
        message: 'Either messageText or imageUrl must be provided based on messageType',
    }
);

/**
 * POST /api/messages/send
 * Sends an Instagram DM to a conversation participant
 *
 * Request Body:
 * - conversationId: UUID of the conversation
 * - messageText: Text content (for text messages)
 * - imageUrl: Image URL (for image messages)
 * - messageType: 'text' | 'image'
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await request.json();

        // Validate request body
        const validationResult = sendMessageSchema.safeParse(body);

        if (!validationResult.success) {
            const errors = validationResult.error.issues.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: errors,
                },
                { status: 400 }
            );
        }

        const { conversationId, messageText, imageUrl, messageType } = validationResult.data;

        await Logger.info(MODULE, `📤 Sending ${messageType} message`, { userId, conversationId });

        // Verify the conversation belongs to the user
        const { data: conversationData, error: convError } = await supabaseAdmin
            .from('instagram_conversations')
            .select('*')
            .eq('id', conversationId)
            .eq('user_id', userId)
            .single();

        if (convError || !conversationData) {
            await Logger.warn(MODULE, `❌ Conversation not found or unauthorized`, {
                userId,
                conversationId,
            });
            return NextResponse.json(
                { error: 'Conversation not found or unauthorized' },
                { status: 404 }
            );
        }

        const conversation = conversationData as DbInstagramConversation;

        // Send message via Instagram API
        let sendResult;
        try {
            if (messageType === 'image' && imageUrl) {
                sendResult = await sendImageMessage(
                    conversation.participant_ig_id,
                    imageUrl,
                    userId
                );
            } else if (messageType === 'text' && messageText) {
                sendResult = await sendMessage(
                    conversation.participant_ig_id,
                    messageText,
                    userId
                );
            } else {
                return NextResponse.json(
                    { error: 'Invalid message type or missing content' },
                    { status: 400 }
                );
            }

            await Logger.info(MODULE, `✅ Message sent via Instagram API`, {
                userId,
                messageId: sendResult.message_id,
            });
        } catch (sendError) {
            const errorMsg = sendError instanceof Error ? sendError.message : 'Unknown send error';
            await Logger.error(MODULE, `❌ Failed to send message: ${errorMsg}`, { userId });

            // Check for rate limit error
            if (errorMsg.includes('rate limit')) {
                return NextResponse.json(
                    {
                        error: 'Rate limit exceeded. Instagram allows 200 messages per hour. Please try again later.',
                        retryAfter: 3600, // 1 hour in seconds
                    },
                    { status: 429 }
                );
            }

            return NextResponse.json({ error: errorMsg }, { status: 500 });
        }

        // Store sent message in database
        const messageData = {
            conversation_id: conversationId,
            ig_message_id: sendResult.message_id,
            sender_ig_id: sendResult.recipient_id, // Our IG ID (swap logic)
            recipient_ig_id: conversation.participant_ig_id,
            message_text: messageText || null,
            message_type: messageType,
            attachments: imageUrl ? [{ type: 'image', url: imageUrl }] : null,
            is_from_user: true,
            ig_created_time: Date.now(),
            created_at: new Date().toISOString(),
        };

        const { data: insertedMessage, error: insertError } = await supabaseAdmin
            .from('instagram_messages')
            .insert(messageData)
            .select()
            .single();

        if (insertError) {
            await Logger.warn(MODULE, `⚠️ Failed to store message in DB: ${insertError.message}`, {
                userId,
            });
            // Don't fail the request if DB insert fails, message was sent
        }

        // Update conversation last_message
        await supabaseAdmin
            .from('instagram_conversations')
            .update({
                last_message_text: messageText || '[Image]',
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', conversationId);

        return NextResponse.json({
            success: true,
            messageId: sendResult.message_id,
            message: insertedMessage,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await Logger.error(MODULE, `❌ Error in send endpoint: ${errorMessage}`, error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
