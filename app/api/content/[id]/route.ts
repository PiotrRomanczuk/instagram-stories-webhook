/**
 * Individual content item API routes
 *
 * GET /api/content/[id] - Get single content item
 * PATCH /api/content/[id] - Update content item
 * DELETE /api/content/[id] - Delete content item
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRole, getUserId } from '@/lib/auth-helpers';
import {
	getContentItemById,
	updateContentItem,
	deleteContentItem,
} from '@/lib/content-db';
import { checkScheduleConflict } from '@/lib/database/schedule-conflict';
import { rateLimiter } from '@/lib/middleware/rate-limit';
import { preventWriteForDemo } from '@/lib/preview-guard';

const API_RATE_LIMIT = { limit: 100, windowMs: 60 * 1000 };

/**
 * GET /api/content/[id]
 */
export async function GET(
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
		if (role !== 'admin' && role !== 'developer' && item.userId !== userId) {
			return NextResponse.json(
				{ error: 'You do not have permission to view this content' },
				{ status: 403 },
			);
		}

		return NextResponse.json({ item });
	} catch (error) {
		console.error('Error in GET /api/content/[id]:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : 'Failed to fetch content',
			},
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/content/[id]
 * Update content item (caption, title, tags, scheduled time)
 *
 * Request body:
 * {
 *   caption?: string,
 *   title?: string,
 *   userTags?: [{username, x, y}],
 *   hashtags?: string[],
 *   scheduledTime?: number,
 *   version: number (for optimistic locking)
 * }
 */
export async function PATCH(
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

		// Fetch current content item
		const item = await getContentItemById(id);

		if (!item) {
			return NextResponse.json(
				{ error: 'Content item not found' },
				{ status: 404 },
			);
		}

		// Check permissions
		if (role !== 'admin' && role !== 'developer' && item.userId !== userId) {
			return NextResponse.json(
				{ error: 'You do not have permission to edit this content' },
				{ status: 403 },
			);
		}

		// Check if content can be edited (not published)
		if (item.publishingStatus === 'published') {
			return NextResponse.json(
				{ error: 'Cannot edit published content' },
				{ status: 400 },
			);
		}

		// Parse request body
		const body = await req.json();
		const { caption, title, userTags, hashtags, scheduledTime, publishingStatus, version } = body;

		// Validate version for optimistic locking
		if (version === undefined) {
			return NextResponse.json(
				{ error: 'version field is required for optimistic locking' },
				{ status: 400 },
			);
		}

		if (typeof version !== 'number') {
			return NextResponse.json(
				{ error: 'version must be a number' },
				{ status: 400 },
			);
		}

		// Check for scheduling conflicts when time is changing
		if (scheduledTime && typeof scheduledTime === 'number') {
			const conflict = await checkScheduleConflict(scheduledTime, {
				excludeId: id,
				excludeTable: 'content_items',
			});
			if (conflict.hasConflict) {
				return NextResponse.json(
					{
						error: 'Scheduling conflict',
						message: `Another post is already scheduled at ${new Date(conflict.conflictingTime!).toLocaleString()}. Please choose a different time.`,
						conflictingId: conflict.conflictingId,
						conflictingTime: conflict.conflictingTime,
					},
					{ status: 409 },
				);
			}
		}

		// Validate caption length
		if (caption && caption.length > 2200) {
			return NextResponse.json(
				{ error: 'Caption exceeds 2200 character limit' },
				{ status: 400 },
			);
		}

		// Update content item
		const updatedItem = await updateContentItem(
			id,
			{
				caption,
				title,
				userTags,
				hashtags,
				scheduledTime,
				publishingStatus,
			},
			version,
		);

		if (!updatedItem) {
			// Check if it was a version conflict
			const currentItem = await getContentItemById(id);
			if (currentItem && currentItem.version !== version) {
				return NextResponse.json(
					{
						error: 'Version conflict. Content was modified by another user.',
						currentVersion: currentItem.version,
					},
					{ status: 409 },
				);
			}

			return NextResponse.json(
				{ error: 'Failed to update content item' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ item: updatedItem });
	} catch (error) {
		console.error('Error in PATCH /api/content/[id]:', error);

		// Handle version conflict errors
		if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
			return NextResponse.json(
				{ error: 'Version conflict. Content was modified by another user.' },
				{ status: 409 },
			);
		}

		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : 'Failed to update content',
			},
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/content/[id]
 * Delete content item (only draft or pending submissions)
 */
export async function DELETE(
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

		// Fetch content item
		const item = await getContentItemById(id);

		if (!item) {
			return NextResponse.json(
				{ error: 'Content item not found' },
				{ status: 404 },
			);
		}

		// Check permissions
		if (role !== 'admin' && role !== 'developer' && item.userId !== userId) {
			return NextResponse.json(
				{ error: 'You do not have permission to delete this content' },
				{ status: 403 },
			);
		}

		// Check if content can be deleted
		if (item.publishingStatus === 'published') {
			return NextResponse.json(
				{ error: 'Cannot delete published content' },
				{ status: 400 },
			);
		}

		// Admins can delete scheduled and failed posts
		const isAdminRole = role === 'admin' || role === 'developer';
		const isScheduled = item.publishingStatus === 'scheduled';
		const isFailed = item.publishingStatus === 'failed';
		const isDraft = item.publishingStatus === 'draft';
		const isPendingSubmission = item.source === 'submission' && item.submissionStatus === 'pending';

		if (!isDraft && !isPendingSubmission && !(isAdminRole && (isScheduled || isFailed))) {
			return NextResponse.json(
				{ error: 'Cannot delete this content item' },
				{ status: 400 },
			);
		}

		// Delete content item (use force delete for scheduled/failed posts)
		const needsForce = isAdminRole && (isScheduled || isFailed);
		const success = await deleteContentItem(id, needsForce);

		if (!success) {
			return NextResponse.json(
				{ error: 'Failed to delete content item' },
				{ status: 500 },
			);
		}

		return NextResponse.json(
			{ message: 'Content item deleted successfully' },
			{ status: 200 },
		);
	} catch (error) {
		console.error('Error in DELETE /api/content/[id]:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : 'Failed to delete content',
			},
			{ status: 500 },
		);
	}
}
