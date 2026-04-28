import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import { fetchAndArchiveStories } from '@/lib/instagram/story-archive';
import { fetchEngagementForArchivedStories } from '@/lib/instagram/story-engagement';
import { Logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const MODULE = 'api:stories:archive:run';

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = session.user.id;

    const archive = await fetchAndArchiveStories(userId);

    let engagement;
    try {
        engagement = await fetchEngagementForArchivedStories(userId);
    } catch (err) {
        Logger.error(MODULE, `Engagement fetch failed for user ${userId}`, err);
        engagement = {
            userId,
            storiesProcessed: 0,
            storiesUpdated: 0,
            storiesFailed: 0,
            errors: [err instanceof Error ? err.message : 'Unknown error'],
        };
    }

    return NextResponse.json({
        success: true,
        result: archive,
        engagement,
        timestamp: new Date().toISOString(),
    });
}
