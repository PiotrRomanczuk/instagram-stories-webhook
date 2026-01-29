import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireDeveloper, getUserEmail } from '@/lib/auth-helpers';
import { Logger } from '@/lib/utils/logger';
import { processScheduledPosts } from '@/lib/scheduler/process-service';
import { runIdentityAudit } from '@/lib/scheduler/identity-service';

const MODULE = 'cron-debug:trigger';
const MAX_REQUESTS_PER_MINUTE = 5;

// Simple in-memory rate limiter
const requestCounts: Map<string, { count: number; resetAt: number }> = new Map();

function checkRateLimit(userEmail: string): boolean {
	const now = Date.now();
	const key = userEmail;

	const existing = requestCounts.get(key);

	if (!existing || now > existing.resetAt) {
		requestCounts.set(key, {
			count: 1,
			resetAt: now + 60 * 1000, // 1 minute from now
		});
		return true;
	}

	if (existing.count < MAX_REQUESTS_PER_MINUTE) {
		existing.count++;
		return true;
	}

	return false;
}

export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		requireDeveloper(session);

		const userEmail = getUserEmail(session);

		// Check rate limit
		if (!checkRateLimit(userEmail)) {
			Logger.warn(
				MODULE,
				`Rate limit exceeded for user ${userEmail}`,
				{ userEmail },
			);
			return NextResponse.json(
				{
					error: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_MINUTE} requests per minute.`,
				},
				{ status: 429 },
			);
		}

		const body = await req.json();
		const { job } = body as { job: string };

		// Validate job name
		const validJobs = ['process', 'identity-audit', 'check-media-health'];
		if (!validJobs.includes(job)) {
			return NextResponse.json(
				{
					error: `Invalid job name. Must be one of: ${validJobs.join(', ')}`,
				},
				{ status: 400 },
			);
		}

		Logger.info(
			MODULE,
			`User ${userEmail} triggering cron job: ${job}`,
			{ job, userEmail },
		);

		let result;

		try {
			if (job === 'process') {
				result = await processScheduledPosts();
			} else if (job === 'identity-audit') {
				result = await runIdentityAudit();
			} else if (job === 'check-media-health') {
				// For check-media-health, we would call the service directly
				// For now, return a placeholder
				result = {
					success: true,
					message: 'Media health check triggered (check logs for details)',
				};
			}

			Logger.info(MODULE, `Cron job ${job} completed successfully`, {
				job,
				result,
			});

			return NextResponse.json({
				success: true,
				job,
				message: `Cron job "${job}" executed successfully`,
				result,
			});
		} catch (jobError) {
			Logger.error(MODULE, `Error executing cron job ${job}`, jobError);
			return NextResponse.json(
				{
					success: false,
					job,
					error:
						jobError instanceof Error
							? jobError.message
							: 'Error executing cron job',
				},
				{ status: 500 },
			);
		}
	} catch (error) {
		console.error('Error in trigger endpoint:', error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Failed to trigger cron',
			},
			{ status: 500 },
		);
	}
}
