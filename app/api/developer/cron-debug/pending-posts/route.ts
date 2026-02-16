import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireDeveloper } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getCurrentEnvironment } from '@/lib/content-db/environment';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'cron-debug:pending-posts';

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		requireDeveloper(session);

		const { searchParams } = new URL(req.url);
		const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

		const now = Date.now();

		// Get pending posts from content_items that should have been processed (scheduled_time <= now)
		const { data: overduePosts, error } = await supabaseAdmin
			.from('content_items')
			.select(
				'id, media_url, caption, scheduled_time, created_at, publishing_status, title',
			)
			.eq('environment', getCurrentEnvironment())
			.eq('publishing_status', 'scheduled')
			.lte('scheduled_time', now)
			.order('scheduled_time', { ascending: true })
			.limit(limit);

		if (error) {
			Logger.error(MODULE, 'Error fetching pending posts', error);
			return NextResponse.json(
				{ error: 'Failed to fetch pending posts' },
				{ status: 500 },
			);
		}

		// Calculate overdue duration for each post
		const postsWithOverdue = overduePosts?.map((post) => {
			const scheduledTime = Number(post.scheduled_time);
			const minutesOverdue = Math.floor((now - scheduledTime) / (1000 * 60));
			return {
				id: post.id,
				url: post.media_url,
				caption: post.caption,
				title: post.title,
				scheduled_time: scheduledTime,
				created_at: post.created_at,
				status: post.publishing_status,
				minutesOverdue,
			};
		}) || [];

		return NextResponse.json({
			posts: postsWithOverdue,
			count: postsWithOverdue.length,
		});
	} catch (error) {
		console.error('Error fetching pending posts:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : 'Failed to fetch pending posts',
			},
			{ status: 500 },
		);
	}
}
