import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import { fetchEngagementForArchivedStories } from '@/lib/instagram/story-engagement';

export const dynamic = 'force-dynamic';

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await fetchEngagementForArchivedStories(session.user.id);
    return NextResponse.json({
        success: true,
        engagement: result,
        timestamp: new Date().toISOString(),
    });
}
