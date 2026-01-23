import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMemeSubmission, reviewMemeSubmission } from '@/lib/memes-db';
import { requireAdmin, getUserId } from '@/lib/auth-helpers';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:memes:review';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * PATCH /api/memes/[id]/review - Admin approve or reject a meme
 * Body: { action: 'approve' | 'reject', rejection_reason?: string }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        requireAdmin(session);

        const { id } = await params;
        const adminId = getUserId(session);

        const body = await request.json();
        const { action, rejection_reason } = body;

        if (!action || !['approve', 'reject'].includes(action)) {
            return NextResponse.json(
                { error: "action must be 'approve' or 'reject'" },
                { status: 400 }
            );
        }

        const meme = await getMemeSubmission(id);

        if (!meme) {
            return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
        }

        if (meme.status !== 'pending') {
            return NextResponse.json(
                { error: `Cannot review: meme is already ${meme.status}` },
                { status: 400 }
            );
        }

        const updated = await reviewMemeSubmission(id, adminId, action, rejection_reason);

        if (!updated) {
            return NextResponse.json({ error: 'Failed to update meme' }, { status: 500 });
        }

        await Logger.info(MODULE, `📝 Meme ${id} ${action}ed by admin`, { adminId });

        return NextResponse.json({ meme: updated });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to review meme';
        Logger.error(MODULE, `PATCH error: ${message}`, error);

        if (message === 'Admin access required') {
            return NextResponse.json({ error: message }, { status: 403 });
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
