/**
 * Review submission API
 * POST /api/content/[id]/review - Approve or reject a submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRole, getUserId } from '@/lib/auth-helpers';
import { getContentItemById, updateSubmissionStatus } from '@/lib/content-db';
import { rateLimiter } from '@/lib/middleware/rate-limit';

const API_RATE_LIMIT = { limit: 100, windowMs: 60 * 1000 };

/**
 * POST /api/content/[id]/review
 * Approve or reject a submission
 *
 * Request body:
 * {
 *   action: 'approve' | 'reject',
 *   rejectionReason?: string (required if action is reject)
 * }
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
		const userEmail = session.user?.email || '';

		// Admin-only endpoint
		if (role !== 'admin' && role !== 'developer') {
			return NextResponse.json(
				{ error: 'Only admins can review submissions' },
				{ status: 403 },
			);
		}

		// Fetch content item
		const item = await getContentItemById(id);

		if (!item) {
			return NextResponse.json(
				{ error: 'Content item not found' },
				{ status: 404 },
			);
		}

		// Check if it's a submission
		if (item.source !== 'submission') {
			return NextResponse.json(
				{ error: 'Can only review submissions' },
				{ status: 400 },
			);
		}


		// Check if it's pending (unless admin override)
		// We allow admins to change their mind and re-review items
		if (item.submissionStatus !== 'pending' && role !== 'admin') {
			return NextResponse.json(
				{ error: `Submission is already ${item.submissionStatus}` },
				{ status: 400 },
			);
		}

		// Parse request body
		const body = await req.json();
		const { action, rejectionReason } = body;

		// Validate action
		if (!action || (action !== 'approve' && action !== 'reject')) {
			return NextResponse.json(
				{ error: 'action must be "approve" or "reject"' },
				{ status: 400 },
			);
		}



		// Update submission status
		const updatedItem = await updateSubmissionStatus(
			id,
			action === 'approve' ? 'approved' : 'rejected',
			rejectionReason,
			userId,
		);

		if (!updatedItem) {
			return NextResponse.json(
				{ error: 'Failed to update submission status' },
				{ status: 500 },
			);
		}

		// Log action
		console.log(`[Review] ${action} submission ${id} by ${userEmail}`);

		return NextResponse.json({
			data: updatedItem,
			message: `Submission ${action}ed successfully`,
		});
	} catch (error) {
		console.error('Error in POST /api/content/[id]/review:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Failed to review submission',
			},
			{ status: 500 },
		);
	}
}
