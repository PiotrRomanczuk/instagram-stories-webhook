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

const MODULE = 'api:stories:archive:thumbnail';

const IMAGE_HEADERS = {
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'private, max-age=300',
};

async function readLocalFile(localPath: string): Promise<Buffer | null> {
    try {
        const absolute = path.isAbsolute(localPath)
            ? localPath
            : path.join(process.cwd(), localPath);
        return await fs.readFile(absolute);
    } catch {
        return null;
    }
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

    // 1. Dedicated thumbnail file (videos)
    if (story.thumbnailPath) {
        const buf = await readLocalFile(story.thumbnailPath);
        if (buf) return new NextResponse(new Uint8Array(buf), { headers: IMAGE_HEADERS });
    }

    // 2. For images, the local archive IS the thumbnail
    if (story.mediaType === 'IMAGE' && story.localPath) {
        const buf = await readLocalFile(story.localPath);
        if (buf) return new NextResponse(new Uint8Array(buf), { headers: IMAGE_HEADERS });
    }

    // 2b. For videos missing a thumbnail row, infer from local_path conventionally
    if (story.mediaType === 'VIDEO' && story.localPath) {
        const inferred = story.localPath.replace(/\.mp4$/i, '_thumb.jpg');
        if (inferred !== story.localPath) {
            const buf = await readLocalFile(inferred);
            if (buf) return new NextResponse(new Uint8Array(buf), { headers: IMAGE_HEADERS });
        }
    }

    // 3. Fallback: proxy the IG CDN thumbnail/media url (works only <24h after IG fetch)
    try {
        const validatedUrl = validateFetchUrl(story.mediaUrlOriginal);
        const remote = await fetch(validatedUrl);
        if (!remote.ok) {
            return NextResponse.json({ error: 'Thumbnail unavailable' }, { status: 410 });
        }
        const buffer = Buffer.from(await remote.arrayBuffer());
        return new NextResponse(new Uint8Array(buffer), { headers: IMAGE_HEADERS });
    } catch (err) {
        Logger.warn(MODULE, `Remote thumbnail fetch failed for ${id}`, err);
        return NextResponse.json({ error: 'Thumbnail unavailable' }, { status: 404 });
    }
}
