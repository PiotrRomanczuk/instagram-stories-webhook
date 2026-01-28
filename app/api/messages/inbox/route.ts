import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getConversations } from '@/lib/instagram/messages';
import { mapConversationRow, type DbInstagramConversation } from '@/lib/types/messaging';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api-messages-inbox';

/**
 * GET /api/messages/inbox
 * Fetches Instagram DM conversations for the authenticated user
 *
 * Query Parameters:
 * - sync: 'true' to sync with Instagram API (optional)
 * - limit: Number of conversations to return (default: 25)
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const searchParams = request.nextUrl.searchParams;
        const shouldSync = searchParams.get('sync') === 'true';
        const limit = parseInt(searchParams.get('limit') || '25', 10);

        await Logger.info(MODULE, `📬 Fetching inbox for user ${userId}`, { shouldSync, limit });

        // If sync is requested, fetch from Instagram API and update database
        if (shouldSync) {
            await Logger.info(MODULE, '🔄 Syncing conversations from Instagram API', { userId });

            try {
                const apiConversations = await getConversations(userId, limit);

                // Upsert conversations to database
                for (const apiConv of apiConversations) {
                    const participant = apiConv.participants.data.find(
                        (p) => p.id !== userId
                    );

                    if (!participant) continue;

                    const conversationData = {
                        user_id: userId,
                        ig_conversation_id: apiConv.id,
                        participant_ig_id: participant.id,
                        participant_username: participant.username,
                        participant_profile_pic: participant.profile_pic || null,
                        last_message_at: apiConv.updated_time,
                        updated_at: new Date().toISOString(),
                    };

                    const { error } = await supabaseAdmin
                        .from('instagram_conversations')
                        .upsert(conversationData, {
                            onConflict: 'ig_conversation_id',
                        });

                    if (error) {
                        await Logger.warn(MODULE, `⚠️ Failed to upsert conversation ${apiConv.id}`, {
                            error: error.message,
                        });
                    }
                }

                await Logger.info(MODULE, `✅ Synced ${apiConversations.length} conversations`, { userId });
            } catch (syncError) {
                const errorMsg = syncError instanceof Error ? syncError.message : 'Unknown sync error';
                await Logger.error(MODULE, `❌ Sync failed: ${errorMsg}`, { userId });
                // Continue to return database data even if sync fails
            }
        }

        // Fetch conversations from database
        const { data: conversationsData, error: dbError } = await supabaseAdmin
            .from('instagram_conversations')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('last_message_at', { ascending: false })
            .limit(limit);

        if (dbError) {
            await Logger.error(MODULE, `❌ Database error: ${dbError.message}`, { userId });
            return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
        }

        const conversations = (conversationsData as DbInstagramConversation[]).map(mapConversationRow);

        await Logger.info(MODULE, `✅ Returned ${conversations.length} conversations`, { userId });

        return NextResponse.json({
            conversations,
            count: conversations.length,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await Logger.error(MODULE, `❌ Error in inbox endpoint: ${errorMessage}`, error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
