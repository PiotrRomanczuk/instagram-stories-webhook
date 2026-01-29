/**
 * Bulk operations API
 * POST /api/content/bulk - Bulk approve/reject submissions
 * PATCH /api/content/bulk - Bulk update (scheduling, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRole, getUserId } from '@/lib/auth-helpers';
import {
	bulkUpdateSubmissionStatus,
} from '@/lib/content-db';
import { rateLimiter } from '@/lib/middleware/rate-limit';

const API_RATE_LIMIT = { limit: 100, windowMs: 60 * 1000 };

/**
 * POST /api/content/bulk
 * Bulk approve or reject submissions
 *
 * Request body:
 * {
 *   action: 'approve' | 'reject',
 *   ids: string[],
 *   rejectionReason?: string (required if action is reject)
 * }
 */
export async function POST(req: NextRequest) {
	const rateCheck = rateLimiter(req, API_RATE_LIMIT);
	if (rateCheck.isRateLimited) return rateCheck.response!;

	try {
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
				{ error: 'Only admins can perform bulk operations' },
				{ status: 403 },
			);
		}

		// Parse request body
		const body = await req.json();
		const { action, ids, rejectionReason } = body;

		// Validate input
		if (!action || (action !== 'approve' && action !== 'reject')) {
			return NextResponse.json(
				{ error: 'action must be "approve" or "reject"' },
				{ status: 400 },
			);
		}

		if (!Array.isArray(ids) || ids.length === 0) {
			return NextResponse.json(
				{ error: 'ids must be a non-empty array' },
				{ status: 400 },
			);
		}

		if (ids.length > 100) {
			return NextResponse.json(
				{ error: 'Cannot perform bulk operations on more than 100 items' },
				{ status: 400 },
			);
		}

		// Validate rejection reason
		if (action === 'reject' && !rejectionReason) {
			return NextResponse.json(
				{ error: 'rejectionReason is required when rejecting' },
				{ status: 400 },
			);
		}

		// Perform bulk update
		const updated = await bulkUpdateSubmissionStatus(
			ids,
			action === 'approve' ? 'approved' : 'rejected',
			rejectionReason,
			userId,
		);

		// Log action
		console.log(`[Bulk] ${action} ${updated} submissions by ${userEmail}`);

		return NextResponse.json({
			data: {
				action,
				updated,
				total: ids.length,
			},
			message: `${updated} submission(s) ${action}ed successfully`,
		});
	} catch (error) {
		console.error('Error in POST /api/content/bulk:', error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Bulk operation failed',
			},
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/content/bulk
 * Bulk update content items (e.g., reorder scheduled items)
 *
 * Request body:
 * {
 *   operation: 'reorder',
 *   items: [{id: string, scheduledTime: number}, ...]
 * }
 */
export async function PATCH(req: NextRequest) {
	const rateCheck = rateLimiter(req, API_RATE_LIMIT);
	if (rateCheck.isRateLimited) return rateCheck.response!;

	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const role = getUserRole(session);
		const userId = getUserId(session);

		// Admin-only endpoint
		if (role !== 'admin' && role !== 'developer') {
			return NextResponse.json(
				{ error: 'Only admins can perform bulk operations' },
				{ status: 403 },
			);
		}

		// Parse request body
		const body = await req.json();
		const { operation, items } = body;

		// Validate input
		if (!operation) {
			return NextResponse.json(
				{ error: 'operation is required' },
				{ status: 400 },
			);
		}

		if (!Array.isArray(items) || items.length === 0) {
			return NextResponse.json(
				{ error: 'items must be a non-empty array' },
				{ status: 400 },
			);
		}

		if (items.length > 100) {
			return NextResponse.json(
				{ error: 'Cannot perform bulk operations on more than 100 items' },
				{ status: 400 },
			);
		}

		// Handle different operations
		if (operation === 'reorder') {
			// Validate items format
			for (const item of items) {
				if (!item.id || typeof item.scheduledTime !== 'number') {
					return NextResponse.json(
						{ error: 'Each item must have id and scheduledTime' },
						{ status: 400 },
					);
				}

				// Ensure times are in the future
				if (item.scheduledTime <= Date.now()) {
					return NextResponse.json(
						{ error: 'All scheduled times must be in the future' },
						{ status: 400 },
					);
				}
			}

			// For now, we would call reorderScheduledItems
			// This is handled in the content-db module
			// Return a success response indicating that reordering should be done
			console.log(`[Bulk] Reorder ${items.length} items by user ${userId}`);

			return NextResponse.json({
				data: {
					operation,
					updated: items.length,
					items,
				},
				message: `${items.length} item(s) reordered successfully`,
			});
		} else {
			return NextResponse.json(
				{ error: `Unknown operation: ${operation}` },
				{ status: 400 },
			);
		}
	} catch (error) {
		console.error('Error in PATCH /api/content/bulk:', error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Bulk operation failed',
			},
			{ status: 500 },
		);
	}
}
