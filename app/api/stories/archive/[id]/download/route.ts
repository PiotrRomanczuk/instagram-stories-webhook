import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import { getArchivedStoryById } from '@/lib/database/story-archive';
import { validateFetchUrl } from '@/lib/utils/url-validation';
import { Logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const MODULE = 'api:stories:archive:download';

function contentTypeFor(mediaType: string): string {
    return mediaType === 'VIDEO' ? 'video/mp4' : 'image/jpeg';
}

function extFor(mediaType: string): string {
    return mediaType === 'VIDEO' ? 'mp4' : 'jpg';
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const story = await getArchivedStoryById(id, session.user.id);

    if (!story) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const filename = `story-${story.igMediaId}.${extFor(story.mediaType)}`;
    const headers = {
        'Content-Type': contentTypeFor(story.mediaType),
        'Content-Disposition': `attachment; filename="${filename}"`,
    };

    // Prefer locally archived file; fall back to original IG CDN url if still alive (<24h)
    if (story.localPath) {
        try {
            const absolute = path.isAbsolute(story.localPath)
                ? story.localPath
                : path.join(process.cwd(), story.localPath);
            const buffer = await fs.readFile(absolute);
            const body = new Uint8Array(buffer);
            return new NextResponse(body, { headers });
        } catch (err) {
            Logger.warn(MODULE, `Local file unavailable for ${id}, falling back to remote`, err);
        }
    }

    try {
        const validatedUrl = validateFetchUrl(story.mediaUrlOriginal);
        const remote = await fetch(validatedUrl);
        if (!remote.ok) {
            return NextResponse.json(
                { error: 'Media no longer available from Instagram (stories expire after 24h)' },
                { status: 410 },
            );
        }
        const buffer = Buffer.from(await remote.arrayBuffer());
        const body = new Uint8Array(buffer);
        return new NextResponse(body, { headers });
    } catch (err) {
        Logger.error(MODULE, `Remote fetch failed for ${id}`, err);
        return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
    }
}
