import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getConversationMessages } from '@/lib/instagram/messages';
import { mapMessageRow, type DbInstagramMessage, type DbInstagramConversation } from '@/lib/types/messaging';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api-messages-conversation';

/**
 * GET /api/messages/[id]
 * Fetches messages from a specific Instagram DM conversation
 *
 * Query Parameters:
 * - sync: 'true' to sync with Instagram API (optional)
 * - limit: Number of messages to return (default: 50)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const { id: conversationId } = await params;
        const searchParams = request.nextUrl.searchParams;
        const shouldSync = searchParams.get('sync') === 'true';
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        await Logger.info(MODULE, `📨 Fetching messages for conversation ${conversationId}`, {
            userId,
            shouldSync,
            limit,
        });

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

        // If sync is requested, fetch from Instagram API and update database
        if (shouldSync) {
            await Logger.info(MODULE, '🔄 Syncing messages from Instagram API', {
                userId,
                igConversationId: conversation.ig_conversation_id,
            });

            try {
                const apiMessages = await getConversationMessages(
                    conversation.ig_conversation_id,
                    userId,
                    limit
                );

                // Insert messages to database (skip duplicates)
                for (const apiMsg of apiMessages) {
                    const messageData = {
                        conversation_id: conversationId,
                        ig_message_id: apiMsg.id,
                        sender_ig_id: apiMsg.from.id,
                        recipient_ig_id: apiMsg.to.data[0]?.id || '',
                        message_text: apiMsg.message,
                        message_type: 'text' as const,
                        attachments: apiMsg.attachments?.data || null,
                        is_from_user: apiMsg.from.id === conversation.participant_ig_id ? false : true,
                        ig_created_time: new Date(apiMsg.created_time).getTime(),
                        created_at: apiMsg.created_time,
                    };

                    const { error } = await supabaseAdmin
                        .from('instagram_messages')
                        .upsert(messageData, {
                            onConflict: 'ig_message_id',
                            ignoreDuplicates: true,
                        });

                    if (error) {
                        await Logger.warn(MODULE, `⚠️ Failed to insert message ${apiMsg.id}`, {
                            error: error.message,
                        });
                    }
                }

                // Update unread count (reset to 0 when viewing)
                await supabaseAdmin
                    .from('instagram_conversations')
                    .update({ unread_count: 0 })
                    .eq('id', conversationId);

                await Logger.info(MODULE, `✅ Synced ${apiMessages.length} messages`, { userId });
            } catch (syncError) {
                const errorMsg = syncError instanceof Error ? syncError.message : 'Unknown sync error';
                await Logger.error(MODULE, `❌ Sync failed: ${errorMsg}`, { userId });
                // Continue to return database data even if sync fails
            }
        }

        // Fetch messages from database
        const { data: messagesData, error: dbError } = await supabaseAdmin
            .from('instagram_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (dbError) {
            await Logger.error(MODULE, `❌ Database error: ${dbError.message}`, { userId });
            return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
        }

        const messages = (messagesData as DbInstagramMessage[]).map(mapMessageRow);

        await Logger.info(MODULE, `✅ Returned ${messages.length} messages`, {
            userId,
            conversationId,
        });

        return NextResponse.json({
            messages,
            count: messages.length,
            conversation: {
                id: conversation.id,
                participantUsername: conversation.participant_username,
                participantProfilePic: conversation.participant_profile_pic,
            },
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await Logger.error(MODULE, `❌ Error in conversation endpoint: ${errorMessage}`, error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
