import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireDeveloper, getUserEmail } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'cron-debug:failed-posts';

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		requireDeveloper(session);

		const { searchParams } = new URL(req.url);
		const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

		// Get failed posts
		const { data: failedPosts, error } = await supabaseAdmin
			.from('scheduled_posts')
			.select('id, url, caption, scheduled_time, error, retry_count, updated_at, status')
			.eq('status', 'failed')
			.order('updated_at', { ascending: false })
			.limit(limit);

		if (error) {
			Logger.error(MODULE, 'Error fetching failed posts', error);
			return NextResponse.json(
				{ error: 'Failed to fetch failed posts' },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			posts: failedPosts || [],
			count: failedPosts?.length || 0,
		});
	} catch (error) {
		console.error('Error fetching failed posts:', error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Failed to fetch failed posts',
			},
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		requireDeveloper(session);

		const body = await req.json();
		const { postId } = body as { postId: string };

		if (!postId) {
			return NextResponse.json(
				{ error: 'postId is required' },
				{ status: 400 },
			);
		}

		// Verify post exists and is failed
		const { data: post, error: fetchError } = await supabaseAdmin
			.from('scheduled_posts')
			.select('id, status')
			.eq('id', postId)
			.single();

		if (fetchError || !post) {
			return NextResponse.json(
				{ error: 'Post not found' },
				{ status: 404 },
			);
		}

		// Reset post to pending for retry
		const { error: updateError } = await supabaseAdmin
			.from('scheduled_posts')
			.update({
				status: 'pending',
				error: null,
				retry_count: 0,
				processing_started_at: null,
			})
			.eq('id', postId);

		if (updateError) {
			Logger.error(MODULE, `Failed to retry post ${postId}`, updateError);
			return NextResponse.json(
				{ error: 'Failed to retry post' },
				{ status: 500 },
			);
		}

		// Log the action
		const userEmail = getUserEmail(session);
		Logger.info(MODULE, `User ${userEmail} retried failed post ${postId}`, {
			postId,
			userEmail,
		});

		return NextResponse.json({
			success: true,
			message: `Post ${postId} reset to pending for retry`,
		});
	} catch (error) {
		console.error('Error retrying post:', error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Failed to retry post',
			},
			{ status: 500 },
		);
	}
}
