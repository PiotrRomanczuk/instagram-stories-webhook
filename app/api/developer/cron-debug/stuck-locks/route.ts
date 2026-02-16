import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireDeveloper, getUserEmail } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getCurrentEnvironment } from '@/lib/content-db/environment';
import { Logger } from '@/lib/utils/logger';
import { releaseContentProcessingLock } from '@/lib/content-db';

const MODULE = 'cron-debug:stuck-locks';

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		requireDeveloper(session);

		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

		// Find posts stuck in processing for > 5 minutes from content_items
		const { data: stuckPosts, error } = await supabaseAdmin
			.from('content_items')
			.select('id, media_url, caption, scheduled_time, processing_started_at, error, retry_count')
			.eq('environment', getCurrentEnvironment())
			.eq('publishing_status', 'processing')
			.lt('processing_started_at', fiveMinutesAgo)
			.order('processing_started_at', { ascending: true });

		if (error) {
			Logger.error(MODULE, 'Error fetching stuck posts', error);
			return NextResponse.json(
				{ error: 'Failed to fetch stuck posts' },
				{ status: 500 },
			);
		}

		// Calculate duration stuck for each post
		const postsWithDuration = stuckPosts?.map((post) => ({
			id: post.id,
			url: post.media_url,
			caption: post.caption,
			scheduled_time: post.scheduled_time,
			processing_started_at: post.processing_started_at,
			error: post.error,
			retry_count: post.retry_count,
			stuckForMinutes: Math.floor(
				(Date.now() - new Date(post.processing_started_at).getTime()) /
					(1000 * 60),
			),
		})) || [];

		return NextResponse.json({
			stuck: postsWithDuration,
			count: postsWithDuration.length,
		});
	} catch (error) {
		console.error('Error fetching stuck locks:', error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Failed to fetch stuck locks',
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

		// Verify post exists in content_items
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

		// Release the lock using content_items function
		const released = await releaseContentProcessingLock(postId);

		if (!released) {
			Logger.warn(
				MODULE,
				`Failed to release lock for post ${postId}`,
				{ status: post.publishing_status },
			);
			return NextResponse.json(
				{ error: 'Failed to release lock' },
				{ status: 500 },
			);
		}

		// Log the action
		const userEmail = getUserEmail(session);
		Logger.info(
			MODULE,
			`User ${userEmail} released processing lock for post ${postId}`,
			{ postId, userEmail },
		);

		return NextResponse.json({
			success: true,
			message: `Lock released for post ${postId}`,
		});
	} catch (error) {
		console.error('Error releasing lock:', error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Failed to release lock',
			},
			{ status: 500 },
		);
	}
}
