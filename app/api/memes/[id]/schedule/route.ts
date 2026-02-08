import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMemeSubmission, scheduleMeme } from '@/lib/memes-db';
import { addScheduledPost } from '@/lib/database/scheduled-posts';
import { checkScheduleConflict } from '@/lib/database/schedule-conflict';
import { requireAdmin, getUserId } from '@/lib/auth-helpers';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:memes:schedule';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/memes/[id]/schedule - Admin schedule meme for later
 * Body: { scheduled_time: number } (Unix timestamp in ms)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        requireAdmin(session);

        const { id } = await params;
        const adminId = getUserId(session);

        const body = await request.json();
        const { scheduled_time } = body;

        if (!scheduled_time || typeof scheduled_time !== 'number') {
            return NextResponse.json(
                { error: 'scheduled_time required (Unix timestamp in ms)' },
                { status: 400 }
            );
        }

        if (scheduled_time < Date.now()) {
            return NextResponse.json(
                { error: 'scheduled_time must be in the future' },
                { status: 400 }
            );
        }

        const meme = await getMemeSubmission(id);

        if (!meme) {
            return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
        }

        if (!['approved', 'pending'].includes(meme.status)) {
            return NextResponse.json(
                { error: `Cannot schedule: meme is ${meme.status}` },
                { status: 400 }
            );
        }

        // Check for scheduling conflicts in the same minute
        const conflict = await checkScheduleConflict(scheduled_time);
        if (conflict.hasConflict) {
            return NextResponse.json(
                {
                    error: 'Scheduling conflict',
                    message: `Another post is already scheduled at ${new Date(conflict.conflictingTime!).toLocaleString()}. Please choose a different time.`,
                    conflictingId: conflict.conflictingId,
                    conflictingTime: conflict.conflictingTime,
                },
                { status: 409 },
            );
        }

        const scheduledPost = await addScheduledPost({
            url: meme.media_url,
            type: 'IMAGE',
            postType: 'STORY',
            caption: meme.caption,
            scheduledTime: scheduled_time,
            userId: meme.user_id,
            userEmail: meme.user_email,
        });

        const updated = await scheduleMeme(id, scheduled_time, scheduledPost.id);

        await Logger.info(MODULE, `📅 Meme ${id} scheduled`, {
            adminId,
            scheduledPostId: scheduledPost.id,
            time: new Date(scheduled_time).toISOString()
        });

        return NextResponse.json({
            success: true,
            meme: updated,
            scheduledPost
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to schedule meme';
        Logger.error(MODULE, `POST error: ${message}`, error);

        if (message === 'Admin access required') {
            return NextResponse.json({ error: message }, { status: 403 });
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
