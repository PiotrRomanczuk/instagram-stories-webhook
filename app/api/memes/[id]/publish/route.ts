import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMemeSubmission, markMemePublished } from '@/lib/memes-db';
import { requireAdmin, getUserId } from '@/lib/auth-helpers';
import { publishMedia } from '@/lib/instagram/publish';
import { Logger } from '@/lib/logger';

const MODULE = 'api:memes:publish';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/memes/[id]/publish - Admin instant publish to Instagram
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        requireAdmin(session);

        const { id } = await params;
        const adminId = getUserId(session);

        const meme = await getMemeSubmission(id);

        if (!meme) {
            return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
        }

        if (!['approved', 'pending'].includes(meme.status)) {
            return NextResponse.json(
                { error: `Cannot publish: meme is ${meme.status}` },
                { status: 400 }
            );
        }

        await Logger.info(MODULE, `🚀 Publishing meme ${id} to Instagram...`, { adminId });

        const result = await publishMedia(
            meme.media_url,
            'IMAGE',
            'STORY',
            meme.caption,
            adminId,
            undefined
        );

        const updated = await markMemePublished(id, result?.id);

        await Logger.info(MODULE, `✅ Meme ${id} published successfully`, { igMediaId: result?.id });

        return NextResponse.json({
            success: true,
            meme: updated,
            igMediaId: result?.id
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to publish meme';
        Logger.error(MODULE, `POST error: ${message}`, error);

        if (message === 'Admin access required') {
            return NextResponse.json({ error: message }, { status: 403 });
        }

        if (message.includes('No active Facebook connection') ||
            message.includes('No Instagram Business Account')) {
            return NextResponse.json(
                { error: 'Link your Instagram account first (Settings > Link Facebook)' },
                { status: 400 }
            );
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
