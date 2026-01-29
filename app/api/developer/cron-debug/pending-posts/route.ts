import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireDeveloper } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'cron-debug:pending-posts';

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		requireDeveloper(session);

		const { searchParams } = new URL(req.url);
		const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

		const now = Math.floor(Date.now() / 1000) * 1000;

		// Get pending posts that should have been processed (scheduled_time <= now)
		const { data: overduePosts, error } = await supabaseAdmin
			.from('scheduled_posts')
			.select(
				'id, url, caption, scheduled_time, created_at, status, meme_id',
			)
			.eq('status', 'pending')
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
			const scheduledTime = post.scheduled_time;
			const minutesOverdue = Math.floor((now - scheduledTime) / (1000 * 60));
			return {
				...post,
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
