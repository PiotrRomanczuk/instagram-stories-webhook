import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireDeveloper } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		requireDeveloper(session);

		const now = new Date();
		const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

		// Get posts in queue (pending and scheduled_time <= now)
		const { count: postsInQueue } = await supabaseAdmin
			.from('scheduled_posts')
			.select('id', { count: 'exact' })
			.eq('status', 'pending')
			.lte('scheduled_time', Math.floor(now.getTime() / 1000) * 1000);

		// Get posts currently processing
		const { count: postsProcessing } = await supabaseAdmin
			.from('scheduled_posts')
			.select('id', { count: 'exact' })
			.eq('status', 'processing');

		// Get posts stuck (processing > 5 minutes)
		const { count: postsStuck } = await supabaseAdmin
			.from('scheduled_posts')
			.select('id', { count: 'exact' })
			.eq('status', 'processing')
			.lt('processing_started_at', fiveMinutesAgo.toISOString());

		// Get failed posts in last 24h
		const { count: failedLast24h } = await supabaseAdmin
			.from('scheduled_posts')
			.select('id', { count: 'exact' })
			.eq('status', 'failed')
			.gte('updated_at', twentyFourHoursAgo.toISOString());

		// Get published posts in last 24h
		const { data: publishedLast24h } = await supabaseAdmin
			.from('scheduled_posts')
			.select('id, published_at', { count: 'exact' })
			.eq('status', 'published')
			.gte('published_at', twentyFourHoursAgo.getTime());

		// Get failed and published posts for error rate calculation
		const { data: recentPosts } = await supabaseAdmin
			.from('scheduled_posts')
			.select('status')
			.in('status', ['published', 'failed', 'cancelled'])
			.gte('updated_at', twentyFourHoursAgo.toISOString());

		const failedCount = recentPosts?.filter((p) => p.status === 'failed').length || 0;
		const successCount =
			recentPosts?.filter((p) => p.status === 'published').length || 0;
		const errorRate =
			successCount + failedCount > 0
				? Math.round((failedCount / (successCount + failedCount)) * 100)
				: 0;

		return NextResponse.json({
			postsInQueue: postsInQueue || 0,
			postsProcessing: postsProcessing || 0,
			postsStuck: postsStuck || 0,
			failedLast24h: failedLast24h || 0,
			publishedLast24h: publishedLast24h?.length || 0,
			errorRate,
		});
	} catch (error) {
		console.error('Error fetching cron metrics:', error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Failed to fetch metrics',
			},
			{ status: 500 },
		);
	}
}
