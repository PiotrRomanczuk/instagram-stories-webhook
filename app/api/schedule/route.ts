import { NextRequest, NextResponse } from 'next/server';
import { addScheduledPost, getScheduledPosts, deleteScheduledPost, updateScheduledPost } from '@/lib/scheduled-posts-db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET - List all scheduled posts for the current user
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');

        // Only fetch posts for the logged-in user
        let posts = await getScheduledPosts(session.user.id);

        // Filter by status if provided
        if (status) {
            posts = posts.filter(p => p.status === status);
        }

        // Sort by scheduled time (earliest first)
        posts.sort((a, b) => a.scheduledTime - b.scheduledTime);

        return NextResponse.json({ posts });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching scheduled posts:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// POST - Schedule a new post
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Import Zod schema
        const { z } = await import('zod');

        // Define server-side validation schema
        const schedulePostSchema = z.object({
            url: z.string().url('Invalid media URL'),
            type: z.enum(['IMAGE', 'VIDEO']),
            postType: z.enum(['STORY']).optional().default('STORY'),
            caption: z.string().max(2200, 'Caption cannot exceed 2200 characters').optional().default(''),
            scheduledTime: z.string().or(z.number()).transform((val) => {
                const timestamp = typeof val === 'string' ? new Date(val).getTime() : val;
                if (isNaN(timestamp)) {
                    throw new Error('Invalid scheduledTime format');
                }
                if (timestamp <= Date.now()) {
                    throw new Error('scheduledTime must be in the future');
                }
                return timestamp;
            }),
            userTags: z.array(z.object({
                username: z.string(),
                x: z.number().min(0).max(1),
                y: z.number().min(0).max(1)
            })).max(20, 'Maximum 20 user tags allowed').optional().default([])
        });

        // Validate request body
        const validationResult = schedulePostSchema.safeParse(body);

        if (!validationResult.success) {
            const errors = validationResult.error.issues.map((err) => ({
                field: err.path.join('.'),
                message: err.message
            }));
            return NextResponse.json({
                error: 'Validation failed',
                details: errors
            }, { status: 400 });
        }

        const { url, type, postType, caption, scheduledTime, userTags } = validationResult.data;

        const post = await addScheduledPost({
            url,
            type,
            postType,
            caption,
            scheduledTime,
            userTags,
            userId: session.user.id // Associate with current user
        });

        console.log(`📅 Scheduled ${postType} (${type}) post for user ${session.user.id} at ${new Date(scheduledTime).toLocaleString()}`);

        return NextResponse.json({
            success: true,
            post,
            message: `Post scheduled for ${new Date(scheduledTime).toLocaleString()}`
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error scheduling post:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// DELETE - Cancel a scheduled post
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing "id" parameter' }, { status: 400 });
        }

        // Verify ownership
        const posts = await getScheduledPosts(session.user.id);
        const postExists = posts.some(p => p.id === id);

        if (!postExists) {
            return NextResponse.json({ error: 'Post not found or unauthorized' }, { status: 404 });
        }

        const deleted = await deleteScheduledPost(id);

        if (!deleted) {
            return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
        }

        console.log(`🗑️ Cancelled scheduled post: ${id} for user ${session.user.id}`);

        return NextResponse.json({ success: true, message: 'Post cancelled' });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error cancelling post:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// PATCH - Update a scheduled post
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Import Zod for validation
        const { z } = await import('zod');

        // Define validation schema for updates (all fields optional except id)
        const updatePostSchema = z.object({
            id: z.string().min(1, 'Post ID is required'),
            url: z.string().url('Invalid media URL').optional(),
            caption: z.string().max(2200, 'Caption cannot exceed 2200 characters').optional(),
            scheduledTime: z.string().or(z.number()).transform((val) => {
                const timestamp = typeof val === 'string' ? new Date(val).getTime() : val;
                if (isNaN(timestamp)) {
                    throw new Error('Invalid scheduledTime format');
                }
                if (timestamp <= Date.now()) {
                    throw new Error('scheduledTime must be in the future');
                }
                return timestamp;
            }).optional(),
            userTags: z.array(z.object({
                username: z.string(),
                x: z.number().min(0).max(1),
                y: z.number().min(0).max(1)
            })).max(20, 'Maximum 20 user tags allowed').optional()
        });

        // Validate request body
        const validationResult = updatePostSchema.safeParse(body);

        if (!validationResult.success) {
            const errors = validationResult.error.issues.map((err) => ({
                field: err.path.join('.'),
                message: err.message
            }));
            return NextResponse.json({
                error: 'Validation failed',
                details: errors
            }, { status: 400 });
        }

        const { id, ...updates } = validationResult.data;

        // Verify ownership
        const posts = await getScheduledPosts(session.user.id);
        const postExists = posts.some(p => p.id === id);

        if (!postExists) {
            return NextResponse.json({ error: 'Post not found or unauthorized' }, { status: 404 });
        }

        // Log updates for debugging
        if (updates.userTags) {
            console.log(`🏷️ Updating tags for post ${id}:`, updates.userTags);
        }

        const post = await updateScheduledPost(id, updates);

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        console.log(`✏️ Updated scheduled post: ${id} for user ${session.user.id}`);

        return NextResponse.json({ success: true, post });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error updating post:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
