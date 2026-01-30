/**
 * Content Insights API
 *
 * GET /api/content/[id]/insights - Fetch Instagram insights for a published content item
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRole, getUserId } from '@/lib/auth-helpers';
import { getContentItemById } from '@/lib/content-db';
import { getMediaInsights } from '@/lib/instagram/insights';
import { rateLimiter } from '@/lib/middleware/rate-limit';

const API_RATE_LIMIT = { limit: 30, windowMs: 60 * 1000 };

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

		// Check if content has Instagram media ID
		if (!item.igMediaId) {
			return NextResponse.json(
				{
					error: 'Insights not available',
					message:
						'This content does not have an Instagram Media ID. It may not have been published yet.',
				},
				{ status: 400 },
			);
		}

		// Check if content is published
		if (item.publishingStatus !== 'published') {
			return NextResponse.json(
				{
					error: 'Insights not available',
					message: 'Insights are only available for published content.',
				},
				{ status: 400 },
			);
		}

		// Fetch insights from Instagram Graph API
		const insights = await getMediaInsights(item.igMediaId, item.userId, 'STORY');

		return NextResponse.json({
			insights,
			igMediaId: item.igMediaId,
			publishedAt: item.publishedAt,
		});
	} catch (error) {
		console.error('Error in GET /api/content/[id]/insights:', error);

		// Check for Instagram API errors
		const errorMessage =
			error instanceof Error ? error.message : 'Failed to fetch insights';

		// Instagram stories expire after 24 hours
		if (
			errorMessage.includes('not found') ||
			errorMessage.includes('expired')
		) {
			return NextResponse.json(
				{
					error: 'Insights unavailable',
					message:
						'This content may have expired. Instagram stories are only available for 24 hours.',
				},
				{ status: 410 },
			);
		}

		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
