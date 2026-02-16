import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireDeveloper } from '@/lib/auth-helpers';
import { forceProcessPost } from '@/lib/scheduler/process-service';
import { Logger } from '@/lib/utils/logger';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getCurrentEnvironment } from '@/lib/content-db/environment';

const requestSchema = z.object({
	postIds: z.array(z.string().min(1)).min(1, 'At least one post ID is required'),
	bypassDuplicates: z.boolean().default(true),
});

interface ProcessResult {
	postId: string;
	status: 'success' | 'failed';
	error?: string;
}

// Rate limiting: store in memory for simplicity (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
	const now = Date.now();
	const limit = rateLimitMap.get(userId);

	if (!limit || now > limit.resetAt) {
		rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 }); // 60 second window
		return true;
	}

	if (limit.count >= 5) {
		return false;
	}

	limit.count++;
	return true;
}

export async function POST(request: NextRequest) {
	try {
		const session = await getServerSession(authOptions);

		try {
			requireDeveloper(session);
		} catch {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
		}

		// Rate limiting
		const userId = session?.user?.email || 'unknown';
		if (!checkRateLimit(userId)) {
			return NextResponse.json(
				{ error: 'Rate limit exceeded: maximum 5 requests per minute' },
				{ status: 429 }
			);
		}

		const body = await request.json();
		const { postIds, bypassDuplicates } = requestSchema.parse(body);

		// Verify all posts exist before processing
		const { data: posts, error: fetchError } = await supabaseAdmin
			.from('content_items')
			.select('id, publishing_status')
			.eq('environment', getCurrentEnvironment())
			.in('id', postIds);

		if (fetchError) {
			await Logger.error('cron-debug', 'Failed to fetch posts for force-process', {
				error: fetchError,
				postIds,
			});
			return NextResponse.json(
				{ error: 'Failed to fetch posts' },
				{ status: 500 }
			);
		}

		// Check if all posts exist
		const existingIds = new Set((posts || []).map((p: { id: string }) => p.id));
		const missingIds = postIds.filter(id => !existingIds.has(id));

		if (missingIds.length > 0) {
			return NextResponse.json(
				{ error: `Posts not found: ${missingIds.join(', ')}` },
				{ status: 404 }
			);
		}

		// Process all posts in parallel
		const results: ProcessResult[] = await Promise.all(
			postIds.map(async (postId): Promise<ProcessResult> => {
				const result = await forceProcessPost(postId, bypassDuplicates);

				return {
					postId,
					status: result.success ? 'success' : 'failed',
					error: result.error,
				};
			})
		);

		const successCount = results.filter(r => r.status === 'success').length;
		const failedCount = results.filter(r => r.status === 'failed').length;

		// Log action to system_logs
		await supabaseAdmin.from('system_logs').insert({
			level: 'info',
			module: 'cron-debug',
			message: `Force-processed ${successCount} posts (${failedCount} failed), bypass duplicates: ${bypassDuplicates}`,
			details: {
				action: 'force-process',
				totalPosts: postIds.length,
				successCount,
				failedCount,
				postIds,
				bypassDuplicates,
				userEmail: session?.user?.email,
				results,
			},
		});

		await Logger.info('cron-debug', 'Force-process completed', {
			successCount,
			failedCount,
			postIds,
			bypassDuplicates,
			userEmail: session?.user?.email,
		});

		return NextResponse.json({
			success: successCount,
			failed: failedCount,
			details: results,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Invalid request body', details: error.issues },
				{ status: 400 }
			);
		}

		await Logger.error('cron-debug', 'Force-process endpoint error', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
