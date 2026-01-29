import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireDeveloper } from '@/lib/auth-helpers';
import { deleteScheduledPosts } from '@/lib/database/scheduled-posts';
import { Logger } from '@/lib/utils/logger';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

const requestSchema = z.object({
	postIds: z
		.array(z.string().min(1))
		.min(1, 'At least one post ID is required'),
});

export async function POST(request: NextRequest) {
	try {
		const session = await getServerSession(authOptions);

		try {
			requireDeveloper(session);
		} catch {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
		}

		const body = await request.json();
		const { postIds } = requestSchema.parse(body);

		// Verify all posts exist before deleting (optional, but good for logging)
		const { data: posts, error: fetchError } = await supabaseAdmin
			.from('scheduled_posts')
			.select('id')
			.in('id', postIds);

		if (fetchError) {
			await Logger.error('cron-debug', 'Failed to fetch posts for deletion', {
				error: fetchError,
				postIds,
			});
			return NextResponse.json(
				{ error: 'Failed to fetch posts' },
				{ status: 500 },
			);
		}

		const deletedCount = await deleteScheduledPosts(postIds);

		// Log action to system_logs
		await supabaseAdmin.from('system_logs').insert({
			level: 'info',
			module: 'cron-debug',
			message: `Deleted ${deletedCount} scheduled posts`,
			details: {
				action: 'delete-posts',
				totalPosts: postIds.length,
				deletedCount,
				postIds,
				userEmail: session?.user?.email,
			},
		});

		await Logger.info('cron-debug', 'Posts deleted successfully', {
			deletedCount,
			postIds,
			userEmail: session?.user?.email,
		});

		return NextResponse.json({
			success: true,
			deletedCount,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Invalid request body', details: error.issues },
				{ status: 400 },
			);
		}

		await Logger.error('cron-debug', 'Delete posts endpoint error', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
