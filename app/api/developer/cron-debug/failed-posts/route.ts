import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireDeveloper, getUserEmail } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getCurrentEnvironment } from '@/lib/content-db/environment';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'cron-debug:failed-posts';

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		requireDeveloper(session);

		const { searchParams } = new URL(req.url);
		const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

		// Get failed posts from content_items
		const { data: failedPosts, error } = await supabaseAdmin
			.from('content_items')
			.select('id, media_url, caption, scheduled_time, error, retry_count, updated_at, publishing_status')
			.eq('environment', getCurrentEnvironment())
			.eq('publishing_status', 'failed')
			.order('updated_at', { ascending: false })
			.limit(limit);

		if (error) {
			Logger.error(MODULE, 'Error fetching failed posts', error);
			return NextResponse.json(
				{ error: 'Failed to fetch failed posts' },
				{ status: 500 },
			);
		}

		// Map to consistent format
		const posts = (failedPosts || []).map(post => ({
			id: post.id,
			url: post.media_url,
			caption: post.caption,
			scheduled_time: post.scheduled_time,
			error: post.error,
			retry_count: post.retry_count,
			updated_at: post.updated_at,
			status: post.publishing_status,
		}));

		return NextResponse.json({
			posts,
			count: posts.length,
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

		// Verify post exists and is failed in content_items
		const { data: post, error: fetchError } = await supabaseAdmin
			.from('content_items')
			.select('id, publishing_status')
			.eq('id', postId)
			.eq('environment', getCurrentEnvironment())
			.single();

		if (fetchError || !post) {
			return NextResponse.json(
				{ error: 'Post not found' },
				{ status: 404 },
			);
		}

		// Reset post to scheduled for retry
		const { error: updateError } = await supabaseAdmin
			.from('content_items')
			.update({
				publishing_status: 'scheduled',
				error: null,
				retry_count: 0,
				processing_started_at: null,
				updated_at: new Date().toISOString(),
			})
			.eq('id', postId)
			.eq('environment', getCurrentEnvironment());

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
			message: `Post ${postId} reset to scheduled for retry`,
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
