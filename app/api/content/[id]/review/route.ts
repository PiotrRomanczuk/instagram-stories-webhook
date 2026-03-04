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
import { preventWriteForDemo } from '@/lib/preview-guard';
import { Logger } from '@/lib/utils/logger';
import { recordAuditEvent, getRequestContext } from '@/lib/utils/audit-log';

const MODULE = 'api:content:review';

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

		const demoGuard = preventWriteForDemo(session);
		if (demoGuard) return demoGuard;

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

		// Log action (persisted to Supabase via Logger)
		await Logger.info(MODULE, `Submission ${id} ${action}ed`, {
			contentId: id,
			action,
			reviewerEmail: userEmail,
			reviewerUserId: userId,
		});

		const { ipAddress, userAgent } = getRequestContext(req);
		await recordAuditEvent({
			actorUserId: userId,
			actorEmail: userEmail,
			action: action === 'approve' ? 'content.approve' : 'content.reject',
			targetType: 'content_item',
			targetId: id,
			oldValue: { submissionStatus: item.submissionStatus },
			newValue: { submissionStatus: action === 'approve' ? 'approved' : 'rejected', rejectionReason: rejectionReason ?? null },
			ipAddress,
			userAgent,
		});

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
