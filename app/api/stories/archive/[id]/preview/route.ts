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

const MODULE = 'api:stories:archive:preview';

function contentTypeFor(mediaType: string): string {
    return mediaType === 'VIDEO' ? 'video/mp4' : 'image/jpeg';
}

function parseRange(rangeHeader: string | null, fileSize: number): { start: number; end: number } | null {
    if (!rangeHeader) return null;
    const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
    if (!match) return null;
    const startStr = match[1];
    const endStr = match[2];
    const start = startStr ? parseInt(startStr, 10) : 0;
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end >= fileSize || start > end) {
        return null;
    }
    return { start, end };
}

export async function GET(
    req: NextRequest,
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

    const contentType = contentTypeFor(story.mediaType);

    if (story.localPath) {
        try {
            const absolute = path.isAbsolute(story.localPath)
                ? story.localPath
                : path.join(process.cwd(), story.localPath);
            const stat = await fs.stat(absolute);
            const fileSize = stat.size;
            const range = parseRange(req.headers.get('range'), fileSize);

            if (range) {
                // Stream a partial chunk for HTTP 206 — required by Safari/iOS for video playback
                const handle = await fs.open(absolute, 'r');
                try {
                    const length = range.end - range.start + 1;
                    const chunk = Buffer.alloc(length);
                    await handle.read(chunk, 0, length, range.start);
                    return new NextResponse(new Uint8Array(chunk), {
                        status: 206,
                        headers: {
                            'Content-Type': contentType,
                            'Content-Length': length.toString(),
                            'Content-Range': `bytes ${range.start}-${range.end}/${fileSize}`,
                            'Accept-Ranges': 'bytes',
                            'Cache-Control': 'private, max-age=300',
                        },
                    });
                } finally {
                    await handle.close();
                }
            }

            const buffer = await fs.readFile(absolute);
            return new NextResponse(new Uint8Array(buffer), {
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': fileSize.toString(),
                    'Accept-Ranges': 'bytes',
                    'Cache-Control': 'private, max-age=300',
                },
            });
        } catch (err) {
            Logger.warn(MODULE, `Local preview unavailable for ${id}, trying remote`, err);
        }
    }

    try {
        const validatedUrl = validateFetchUrl(story.mediaUrlOriginal);
        const remote = await fetch(validatedUrl);
        if (!remote.ok) {
            return NextResponse.json(
                { error: 'Media expired (Instagram CDN URLs are short-lived)' },
                { status: 410 },
            );
        }
        const buffer = Buffer.from(await remote.arrayBuffer());
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'private, max-age=300',
            },
        });
    } catch (err) {
        Logger.error(MODULE, `Remote preview fetch failed for ${id}`, err);
        return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
    }
}
