import { NextRequest, NextResponse } from 'next/server';
import { addScheduledPost, getScheduledPosts, deleteScheduledPost, updateScheduledPost } from '@/lib/scheduled-posts-db';

// GET - List all scheduled posts
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');

        let posts = await getScheduledPosts();

        // Filter by status if provided
        if (status) {
            posts = posts.filter(p => p.status === status);
        }

        // Sort by scheduled time (earliest first)
        posts.sort((a, b) => a.scheduledTime - b.scheduledTime);

        return NextResponse.json({ posts });
    } catch (error: any) {
        console.error('Error fetching scheduled posts:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Schedule a new post
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, type, scheduledTime } = body;

        // Validation
        if (!url) {
            return NextResponse.json({ error: 'Missing "url" in request body' }, { status: 400 });
        }

        if (!scheduledTime) {
            return NextResponse.json({ error: 'Missing "scheduledTime" in request body' }, { status: 400 });
        }

        const scheduledTimeMs = typeof scheduledTime === 'string'
            ? new Date(scheduledTime).getTime()
            : scheduledTime;

        if (isNaN(scheduledTimeMs)) {
            return NextResponse.json({ error: 'Invalid scheduledTime format' }, { status: 400 });
        }

        if (scheduledTimeMs <= Date.now()) {
            return NextResponse.json({ error: 'scheduledTime must be in the future' }, { status: 400 });
        }

        const mediaType = type === 'VIDEO' ? 'VIDEO' : 'IMAGE';

        const post = await addScheduledPost({
            url,
            type: mediaType,
            scheduledTime: scheduledTimeMs,
        });

        console.log(`📅 Scheduled ${mediaType} post for ${new Date(scheduledTimeMs).toLocaleString()}`);

        return NextResponse.json({
            success: true,
            post,
            message: `Post scheduled for ${new Date(scheduledTimeMs).toLocaleString()}`
        });
    } catch (error: any) {
        console.error('Error scheduling post:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Cancel a scheduled post
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing "id" parameter' }, { status: 400 });
        }

        const deleted = await deleteScheduledPost(id);

        if (!deleted) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        console.log(`🗑️ Cancelled scheduled post: ${id}`);

        return NextResponse.json({ success: true, message: 'Post cancelled' });
    } catch (error: any) {
        console.error('Error cancelling post:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH - Update a scheduled post
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing "id" in request body' }, { status: 400 });
        }

        // If updating scheduledTime, validate it
        if (updates.scheduledTime) {
            const scheduledTimeMs = typeof updates.scheduledTime === 'string'
                ? new Date(updates.scheduledTime).getTime()
                : updates.scheduledTime;

            if (isNaN(scheduledTimeMs)) {
                return NextResponse.json({ error: 'Invalid scheduledTime format' }, { status: 400 });
            }

            if (scheduledTimeMs <= Date.now()) {
                return NextResponse.json({ error: 'scheduledTime must be in the future' }, { status: 400 });
            }

            updates.scheduledTime = scheduledTimeMs;
        }

        const post = await updateScheduledPost(id, updates);

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        console.log(`✏️ Updated scheduled post: ${id}`);

        return NextResponse.json({ success: true, post });
    } catch (error: any) {
        console.error('Error updating post:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
