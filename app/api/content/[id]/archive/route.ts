/**
 * Archive content item API route
 *
 * POST /api/content/[id]/archive - Soft-archive a content item
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRole, getUserId } from '@/lib/auth-helpers';
import { getContentItemById, archiveContentItem } from '@/lib/content-db';
import { rateLimiter } from '@/lib/middleware/rate-limit';

const API_RATE_LIMIT = { limit: 100, windowMs: 60 * 1000 };

/**
 * POST /api/content/[id]/archive
 * Soft-archive a content item (sets archived_at timestamp)
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

		const item = await getContentItemById(id);

		if (!item) {
			return NextResponse.json(
				{ error: 'Content item not found' },
				{ status: 404 },
			);
		}

		// Check permissions: admin or own content
		if (role !== 'admin' && role !== 'developer' && item.userId !== userId) {
			return NextResponse.json(
				{ error: 'You do not have permission to archive this content' },
				{ status: 403 },
			);
		}

		// Cannot archive published content
		if (item.publishingStatus === 'published') {
			return NextResponse.json(
				{ error: 'Cannot archive published content' },
				{ status: 400 },
			);
		}

		// Already archived
		if (item.archivedAt) {
			return NextResponse.json(
				{ error: 'Content is already archived' },
				{ status: 400 },
			);
		}

		const success = await archiveContentItem(id);

		if (!success) {
			return NextResponse.json(
				{ error: 'Failed to archive content item' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ message: 'Content archived successfully' });
	} catch (error) {
		console.error('Error in POST /api/content/[id]/archive:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : 'Failed to archive content',
			},
			{ status: 500 },
		);
	}
}
