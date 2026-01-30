/**
 * Schedule content API
 * POST /api/content/[id]/schedule - Set scheduled time for content
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRole, getUserId } from '@/lib/auth-helpers';
import { getContentItemById, updateScheduledTime } from '@/lib/content-db';
import { rateLimiter } from '@/lib/middleware/rate-limit';

const API_RATE_LIMIT = { limit: 100, windowMs: 60 * 1000 };

/**
 * POST /api/content/[id]/schedule
 * Set the scheduled time for content to be published
 *
 * Request body:
 * {
 *   scheduledTime: number (Unix timestamp in milliseconds, must be in future)
 * }
 *
 * Notes:
 * - Only admins can schedule submissions
 * - Users can schedule their own direct posts
 * - Only works if content is in draft or scheduled status
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const rateCheck = rateLimiter(req, API_RATE_LIMIT);
	if (rateCheck.isRateLimited) return rateCheck.response!;

	try {
		const { id } = await params;
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = getUserId(session);
		const role = getUserRole(session);

		// Fetch content item
		const item = await getContentItemById(id);

		if (!item) {
			return NextResponse.json(
				{ error: 'Content item not found' },
				{ status: 404 },
			);
		}

		// Check permissions
		if (role !== 'admin' && role !== 'developer') {
			// Non-admins can only schedule their own direct posts
			if (item.userId !== userId || item.source !== 'direct') {
				return NextResponse.json(
					{ error: 'You do not have permission to schedule this content' },
					{ status: 403 },
				);
			}
		}

		// Check if submission is approved (if it's a submission)
		if (item.source === 'submission' && item.submissionStatus !== 'approved') {
			return NextResponse.json(
				{ error: 'Only approved submissions can be scheduled' },
				{ status: 400 },
			);
		}

		// Parse request body
		const body = await req.json();
		const { scheduledTime } = body;

		// Validate scheduled time
		if (!scheduledTime || typeof scheduledTime !== 'number') {
			return NextResponse.json(
				{
					error:
						'scheduledTime must be a number (Unix timestamp in milliseconds)',
				},
				{ status: 400 },
			);
		}

		// Ensure scheduled time is in the future
		const now = Date.now();
		if (scheduledTime <= now) {
			return NextResponse.json(
				{
					error: 'Scheduled time must be in the future',
					now,
					provided: scheduledTime,
				},
				{ status: 400 },
			);
		}

		// Update scheduled time
		const updatedItem = await updateScheduledTime(id, scheduledTime);

		if (!updatedItem) {
			return NextResponse.json(
				{ error: 'Failed to schedule content' },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			data: updatedItem,
			message: 'Content scheduled successfully',
		});
	} catch (error) {
		console.error('Error in POST /api/content/[id]/schedule:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : 'Failed to schedule content',
			},
			{ status: 500 },
		);
	}
}
