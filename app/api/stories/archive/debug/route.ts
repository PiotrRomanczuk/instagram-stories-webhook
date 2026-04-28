import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import { getLinkedFacebookAccount } from '@/lib/database/linked-accounts';
import { getRecentStories } from '@/lib/instagram/media';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
const MODULE = 'api:stories:archive:debug';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = session.user.id;
    const linked = await getLinkedFacebookAccount(userId);

    // Pull live IG stories (24h window)
    let liveStories: { id: string; mediaType: string; timestamp: string; permalink?: string }[] = [];
    let liveError: string | null = null;
    if (linked?.ig_user_id) {
        try {
            const { stories } = await getRecentStories(userId, 25);
            liveStories = stories.map((s) => ({
                id: s.id,
                mediaType: s.media_type,
                timestamp: s.timestamp,
                permalink: s.permalink,
            }));
        } catch (err) {
            liveError = err instanceof Error ? err.message : 'Unknown error';
            Logger.warn(MODULE, `getRecentStories failed for ${userId}`, err);
        }
    }

    // Archive table state for this user
    const { count: archivedCount } = await supabaseAdmin
        .from('story_archive')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

    const { data: lastArchive } = await supabaseAdmin
        .from('story_archive')
        .select('ig_media_id, ig_timestamp, download_status, download_error, created_at, local_path')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

    // Last cron lock heartbeat
    const { data: lockRow } = await supabaseAdmin
        .from('cron_locks')
        .select('locked_at, expires_at')
        .eq('lock_name', 'archive-stories')
        .maybeSingle();

    return NextResponse.json({
        session: {
            userId,
            email: session.user.email,
            role: (session.user as { role?: string }).role,
        },
        linkedAccount: linked
            ? {
                  igUserId: linked.ig_user_id,
                  igUsername: linked.ig_username,
                  hasAccessToken: !!linked.access_token,
                  tokenPreview: linked.access_token
                      ? `${linked.access_token.slice(0, 6)}...${linked.access_token.slice(-4)}`
                      : null,
                  expiresAt: linked.expires_at,
              }
            : null,
        liveStories: {
            count: liveStories.length,
            items: liveStories,
            error: liveError,
        },
        archive: {
            totalForUser: archivedCount ?? 0,
            recent: lastArchive ?? [],
        },
        cronLock: lockRow ?? null,
        env: {
            hasCronSecret: !!process.env.CRON_SECRET,
            dataDir: process.env.DATA_DIR ?? '(default ./data)',
        },
        timestamp: new Date().toISOString(),
    });
}
