import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
    getMemeSubmission,
    reviewMemeSubmission,
    deleteMemeSubmission,
    scheduleMeme
} from '@/lib/memes-db';
import { addScheduledPost } from '@/lib/database/scheduled-posts';
import { getUserRole, getUserId, requireAdmin } from '@/lib/auth-helpers';
import { reviewMemeSchema } from '@/lib/validations/meme.schema';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = getUserId(session);
        const role = getUserRole(session);

        const meme = await getMemeSubmission(id);
        if (!meme) {
            return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
        }

        if (role !== 'admin' && meme.user_id !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({ meme });
    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Internal Server Error'
        }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        requireAdmin(session);
        const adminId = getUserId(session);

        const body = await req.json();
        const validated = reviewMemeSchema.parse(body);

        let result;

        if (validated.action === 'schedule') {
            const meme = await getMemeSubmission(id);
            if (!meme) return NextResponse.json({ error: 'Meme not found' }, { status: 404 });

            const scheduledPost = await addScheduledPost({
                url: meme.media_url,
                type: 'IMAGE',
                postType: 'STORY',
                caption: meme.caption || '',
                scheduledTime: validated.scheduledFor!.getTime(),
                userId: meme.user_id,
                memeId: id
            });

            result = await scheduleMeme(id, validated.scheduledFor!.getTime(), scheduledPost.id);
        } else {
            result = await reviewMemeSubmission(
                id,
                adminId,
                validated.action,
                validated.rejectionReason
            );
        }

        if (!result) {
            return NextResponse.json({ error: 'Failed to update meme' }, { status: 500 });
        }

        return NextResponse.json({ meme: result });
    } catch (_error) {
        const message = _error instanceof Error ? _error.message : 'Internal Server Error';
        if (message === 'Admin access required') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        // Handle Zod validation errors with full details
        if (_error instanceof Error && _error.name === 'ZodError') {
            const zodError = _error as unknown as { issues: Array<{ path: string[], message: string }> };
            const details = zodError.issues?.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
            console.error('[Meme PATCH] Zod validation failed:', details);
            return NextResponse.json({
                error: 'Validation failed',
                details
            }, { status: 400 });
        }

        console.error('[Meme PATCH] Error:', _error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = getUserId(session);
        const role = getUserRole(session);

        const meme = await getMemeSubmission(id);
        if (!meme) {
            return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
        }

        // Owners can only delete if still pending. Admins can delete anything.
        if (role !== 'admin') {
            if (meme.user_id !== userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            if (meme.status !== 'pending') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const success = await deleteMemeSubmission(id);
        if (!success) {
            return NextResponse.json({ error: 'Failed to delete meme' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Internal Server Error'
        }, { status: 500 });
    }
}
