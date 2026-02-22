import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import { verifyMetaWebhookSignature } from '@/lib/utils/crypto-signing';
import * as Sentry from '@sentry/nextjs';
import type {
    InstagramWebhookEvent,
    InstagramMessagingEvent,
    DbInstagramConversation,
} from '@/lib/types/messaging';

const MODULE = 'webhook-instagram';

/**
 * GET /api/webhook/instagram
 * Webhook verification endpoint for Meta
 *
 * Meta will send a GET request with:
 * - hub.mode=subscribe
 * - hub.verify_token=<YOUR_VERIFY_TOKEN>
 * - hub.challenge=<CHALLENGE_STRING>
 *
 * We must respond with hub.challenge if verify_token matches
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const mode = searchParams.get('hub.mode');
        const token = searchParams.get('hub.verify_token');
        const challenge = searchParams.get('hub.challenge');

        const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || process.env.WEBHOOK_SECRET;

        await Logger.info(MODULE, '🔍 Webhook verification request received', { mode, hasToken: !!token });

        // Check if mode and token are present
        if (mode && token) {
            // Check if mode and token match
            if (mode === 'subscribe' && token === verifyToken) {
                await Logger.info(MODULE, '✅ Webhook verified successfully');
                // Respond with challenge to verify the webhook
                return new NextResponse(challenge, { status: 200 });
            } else {
                await Logger.warn(MODULE, '❌ Webhook verification failed - token mismatch', { mode });
                return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
            }
        }

        await Logger.warn(MODULE, '❌ Webhook verification failed - missing parameters');
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await Logger.error(MODULE, `❌ Webhook verification error: ${errorMessage}`, error);
        return NextResponse.json({ error: 'Verification error' }, { status: 500 });
    }
}

/**
 * POST /api/webhook/instagram
 * Receives Instagram messaging webhook events from Meta
 *
 * Events include:
 * - New messages received
 * - Message delivery confirmations
 * - Read receipts
 * - Postback events
 */
export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();

        // Verify Meta webhook signature (X-Hub-Signature-256)
        const appSecret = process.env.AUTH_FACEBOOK_SECRET || process.env.FB_APP_SECRET;
        if (appSecret) {
            const signatureHeader = request.headers.get('x-hub-signature-256');
            if (!verifyMetaWebhookSignature(rawBody, signatureHeader, appSecret)) {
                await Logger.warn(MODULE, 'Invalid webhook signature');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        } else {
            await Logger.error(MODULE, 'AUTH_FACEBOOK_SECRET not configured — rejecting webhook');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        await Logger.info(MODULE, 'Instagram webhook event received');

        const body = JSON.parse(rawBody) as InstagramWebhookEvent;

        // Validate webhook payload structure
        if (body.object !== 'instagram') {
            await Logger.warn(MODULE, '⚠️ Invalid webhook object type', { object: body.object });
            return NextResponse.json({ error: 'Invalid object type' }, { status: 400 });
        }

        // Process each entry in the webhook
        for (const entry of body.entry) {
            const igUserId = entry.id; // Instagram User ID (IGSID) of our account
            const time = entry.time;

            await Logger.info(MODULE, `📨 Processing entry for IG user ${igUserId}`, { time });

            // Process messaging events
            if (entry.messaging) {
                for (const event of entry.messaging) {
                    await processMessagingEvent(event, igUserId);
                }
            }
        }

        // Always return 200 OK to acknowledge receipt
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await Logger.error(MODULE, `❌ Webhook processing error: ${errorMessage}`, error);
        Sentry.captureException(error, {
            tags: {
                module: "api:webhook",
                route: "/api/webhook/instagram",
                method: "POST",
            },
        });

        // Still return 200 to prevent Meta from retrying
        return NextResponse.json({ success: false, error: errorMessage }, { status: 200 });
    }
}

/**
 * Process a single messaging event
 */
async function processMessagingEvent(
    event: InstagramMessagingEvent,
    ourIgUserId: string
): Promise<void> {
    try {
        const senderId = event.sender.id;
        const recipientId = event.recipient.id;
        const timestamp = event.timestamp;

        // Determine if this is a message we sent (echo) or received
        const isEcho = event.message?.is_echo || false;
        const isFromUser = !isEcho && recipientId === ourIgUserId;

        await Logger.info(MODULE, `📩 Message event: ${isEcho ? 'echo' : 'received'}`, {
            senderId,
            recipientId,
            isFromUser,
        });

        // Skip echo messages (messages we sent)
        if (isEcho) {
            await Logger.debug(MODULE, '⏭️ Skipping echo message');
            return;
        }

        // Find the user who owns this Instagram account
        const { data: linkedAccount, error: accountError } = await supabaseAdmin
            .from('linked_accounts')
            .select('user_id')
            .eq('ig_user_id', ourIgUserId)
            .eq('provider', 'facebook')
            .single();

        if (accountError || !linkedAccount) {
            await Logger.warn(MODULE, `⚠️ No linked account found for IG user ${ourIgUserId}`);
            return;
        }

        const userId = linkedAccount.user_id;
        const participantIgId = isFromUser ? senderId : recipientId;

        // Find or create conversation
        const conversation = await findOrCreateConversation(userId, participantIgId);

        // Process message if present
        if (event.message) {
            const messageId = event.message.mid;
            const messageText = event.message.text || null;
            const attachments = event.message.attachments || null;

            // Determine message type
            let messageType: 'text' | 'image' | 'video' | 'story_reply' = 'text';
            if (attachments && attachments.length > 0) {
                messageType = attachments[0].type as 'image' | 'video';
            }

            // Insert message to database
            const messageData = {
                conversation_id: conversation.id,
                ig_message_id: messageId,
                sender_ig_id: senderId,
                recipient_ig_id: recipientId,
                message_text: messageText,
                message_type: messageType,
                attachments: attachments || null,
                is_from_user: !isFromUser, // Invert: true = from our account
                ig_created_time: timestamp,
                created_at: new Date(timestamp).toISOString(),
            };

            const { error: insertError } = await supabaseAdmin
                .from('instagram_messages')
                .insert(messageData);

            if (insertError) {
                // Check if duplicate (unique constraint on ig_message_id)
                if (insertError.code === '23505') {
                    await Logger.debug(MODULE, '⏭️ Duplicate message, skipping', { messageId });
                } else {
                    await Logger.error(MODULE, `❌ Failed to insert message: ${insertError.message}`, {
                        messageId,
                    });
                }
            } else {
                await Logger.info(MODULE, `✅ Message stored in database`, { messageId });

                // Update conversation
                await supabaseAdmin
                    .from('instagram_conversations')
                    .update({
                        last_message_text: messageText || '[Media]',
                        last_message_at: new Date(timestamp).toISOString(),
                        unread_count: conversation.unread_count + 1,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', conversation.id);
            }
        }

        // Process postback if present (e.g., button clicks)
        if (event.postback) {
            await Logger.info(MODULE, '📲 Postback event received', {
                payload: event.postback.payload,
                title: event.postback.title,
            });
            // Handle postback events (e.g., quick reply buttons)
            // Implementation depends on your use case
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await Logger.error(MODULE, `❌ Error processing messaging event: ${errorMessage}`, error);
    }
}

/**
 * Find existing conversation or create a new one
 */
async function findOrCreateConversation(
    userId: string,
    participantIgId: string
): Promise<DbInstagramConversation> {
    // Try to find existing conversation
    const { data: existingConv, error: findError } = await supabaseAdmin
        .from('instagram_conversations')
        .select('id, user_id, ig_conversation_id, participant_ig_id, participant_username, participant_profile_pic, last_message_text, last_message_at, unread_count, is_active, created_at, updated_at')
        .eq('user_id', userId)
        .eq('participant_ig_id', participantIgId)
        .single();

    if (existingConv && !findError) {
        return existingConv as DbInstagramConversation;
    }

    // Create new conversation
    await Logger.info(MODULE, '➕ Creating new conversation', { userId, participantIgId });

    const conversationData = {
        user_id: userId,
        ig_conversation_id: `${userId}_${participantIgId}`, // Temporary ID until we fetch real one
        participant_ig_id: participantIgId,
        participant_username: null, // Will be updated when we fetch from API
        participant_profile_pic: null,
        last_message_text: null,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        is_active: true,
    };

    const { data: newConv, error: createError } = await supabaseAdmin
        .from('instagram_conversations')
        .insert(conversationData)
        .select()
        .single();

    if (createError || !newConv) {
        throw new Error(`Failed to create conversation: ${createError?.message}`);
    }

    return newConv as DbInstagramConversation;
}
