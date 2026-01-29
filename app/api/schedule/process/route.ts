import { NextRequest, NextResponse } from 'next/server';
import { processScheduledPosts } from '@/lib/scheduler/process-service';
import { cleanupOldMedia } from '@/lib/scheduler/cleanup-service';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

// This endpoint should be called periodically (e.g., every minute via cron job)
// OR manually by a user to "Post Immediately"
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const postId = searchParams.get('id') || undefined;

		console.log(
			`[API] 🚀 Process request received${postId ? ` for post ${postId}` : ''}`,
		);

		const session = await getServerSession(authOptions);
		const authHeader = request.headers.get('authorization');
		const secret = process.env.CRON_SECRET;

		const isCron = secret && authHeader === `Bearer ${secret}`;
		const isUserAuth = !!session?.user?.id;

		if (!isCron && !isUserAuth) {
			console.error(
				'🔒 Unauthorized attempt: Invalid or missing secret/session',
			);
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Security: If a user is triggering a specific post, verify they OWN it
		if (postId && !isCron && isUserAuth) {
			const { data: post, error } = await supabaseAdmin
				.from('scheduled_posts')
				.select('user_id')
				.eq('id', postId)
				.single();

			if (error || !post || post.user_id !== session.user.id) {
				console.error(
					`🔒 Unauthorized post-immediately attempt by ${session.user.id} for post ${postId}`,
				);
				return NextResponse.json(
					{ error: 'Post not found or unauthorized' },
					{ status: 404 },
				);
			}
		}

		// If a specific postId is provided (manual trigger), we bypass duplicate checks
		// because the user explicitly requested "Submit Now"
		const result = await processScheduledPosts(postId, !!postId);

		// Run cleanup only on general background sweeps (cron), not on specific user triggers
		if (!postId) {
			// Non-blocking cleanup (fire and forget)
			cleanupOldMedia().catch((err) => console.error('Cleanup failed:', err));
		}

		// If a specific post was requested but not processed, return an error
		if (postId && result.processed === 0) {
			console.warn(
				`[API] ⚠️ Post ${postId} was not processed: ${result.message}`,
			);
			return NextResponse.json(
				{
					error:
						result.message ||
						'Post could not be processed (it might be locked or already finished)',
					...result,
				},
				{ status: 400 },
			);
		}

		return NextResponse.json(result);
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		console.error('Error processing scheduled posts API:', error);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
