/**
 * Unified Content Hub API
 * Consolidates meme submissions and scheduled posts into a single API
 *
 * GET /api/content - List all content with filters
 * POST /api/content - Create new content (submission or direct)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRole, getUserId } from '@/lib/auth-helpers';
import {
	getContentItems,
	createContentItem,
	getContentStats,
} from '@/lib/content-db';
import { rateLimiter } from '@/lib/middleware/rate-limit';
import {
	CreateContentInput,
	ContentSource,
	SubmissionStatus,
	PublishingStatus,
} from '@/lib/types/posts';

const API_RATE_LIMIT = { limit: 100, windowMs: 60 * 1000 };

/**
 * GET /api/content
 * List content items with filters
 *
 * Query Parameters:
 * - source: 'submission' | 'direct' (filter by source)
 * - submissionStatus: 'pending' | 'approved' | 'rejected' (for submissions)
 * - publishingStatus: 'draft' | 'scheduled' | 'processing' | 'published' | 'failed'
 * - search: text search in caption/title
 * - sortBy: 'newest' | 'oldest' | 'schedule-asc'
 * - page: pagination page (default 1)
 * - limit: items per page (default 20)
 * - tab: 'all' | 'review' | 'queue' | 'published' | 'rejected' | 'failed' (convenience grouping)
 * - scheduleFilter: 'today' | 'week' (for queue tab only)
 */
export async function GET(req: NextRequest) {
	const rateCheck = rateLimiter(req, API_RATE_LIMIT);
	if (rateCheck.isRateLimited) return rateCheck.response!;

	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = getUserId(session);
		const role = getUserRole(session);
		const { searchParams } = new URL(req.url);

		// Parse query parameters
		const source = searchParams.get('source') as ContentSource | null;
		const submissionStatus = searchParams.get('submissionStatus') as SubmissionStatus | null;
		const publishingStatus = searchParams.get('publishingStatus') as PublishingStatus | null;
		const search = searchParams.get('search') || undefined;
		const sortBy = searchParams.get('sortBy') as 'newest' | 'oldest' | 'schedule-asc' | null;
		const tab = searchParams.get('tab') || 'all';
		const scheduleFilter = searchParams.get('scheduleFilter') as 'today' | 'week' | null;
		const page = parseInt(searchParams.get('page') || '1', 10);
		const limit = parseInt(searchParams.get('limit') || '20', 10);
		const offset = (page - 1) * limit;

		// Build filter options based on tab
		let filterOptions: Parameters<typeof getContentItems>[0] = {
			search,
			sortBy: sortBy || 'newest',
			limit,
			offset,
		};

		// Apply tab-based filters
		switch (tab) {
			case 'review':
				// Admins only: pending submissions
				if (role !== 'admin' && role !== 'developer') {
					return NextResponse.json(
						{ error: 'Only admins can access review queue' },
						{ status: 403 },
					);
				}
				filterOptions.source = 'submission';
				filterOptions.submissionStatus = 'pending';
				break;

			case 'queue':
				// Scheduled/processing items
				filterOptions.publishingStatus = 'scheduled';
				// Non-admins see only their own
				if (role !== 'admin' && role !== 'developer') {
					filterOptions.userId = userId;
				}
				// Apply schedule time filter
				if (scheduleFilter === 'today') {
					const now = new Date();
					const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
					const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
					filterOptions.scheduledTimeAfter = startOfDay;
					filterOptions.scheduledTimeBefore = endOfDay;
				} else if (scheduleFilter === 'week') {
					const now = new Date();
					const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
					const endOfWeek = startOfDay + 7 * 24 * 60 * 60 * 1000;
					filterOptions.scheduledTimeAfter = startOfDay;
					filterOptions.scheduledTimeBefore = endOfWeek;
				} else if (scheduleFilter === 'overdue') {
					// Overdue: scheduled but past due time
					const now = Date.now();
					filterOptions.scheduledTimeBefore = now;
				}
				break;

			case 'published':
				// Published items — only show items that actually reached Instagram
				filterOptions.publishingStatus = 'published';
				filterOptions.requireIgMediaId = true;
				// Non-admins see only their own
				if (role !== 'admin' && role !== 'developer') {
					filterOptions.userId = userId;
				}
				break;

			case 'rejected':
				// Admins only: rejected submissions
				if (role !== 'admin' && role !== 'developer') {
					return NextResponse.json(
						{ error: 'Only admins can access rejected items' },
						{ status: 403 },
					);
				}
				filterOptions.source = 'submission';
				filterOptions.submissionStatus = 'rejected';
				break;

			case 'failed':
				// Items that failed publishing (admins/developers only)
				if (role !== 'admin' && role !== 'developer') {
					return NextResponse.json(
						{ error: 'Only admins can access failed items' },
						{ status: 403 },
					);
				}
				filterOptions.publishingStatus = 'failed';
				break;

			case 'all':
			default:
				// All content (with explicit filters if provided)
				if (source) filterOptions.source = source;
				if (submissionStatus) filterOptions.submissionStatus = submissionStatus;
				if (publishingStatus) filterOptions.publishingStatus = publishingStatus;

				// Non-admins see only their own
				if (role !== 'admin' && role !== 'developer') {
					filterOptions.userId = userId;
				}
				break;
		}

		// Fetch content and stats
		const { items, total } = await getContentItems(filterOptions);
		const stats =
			role === 'admin' || role === 'developer' ? await getContentStats() : null;

		return NextResponse.json({
			items,
			pagination: {
				page,
				limit,
				total,
				hasMore: offset + limit < total,
			},
			stats,
		});
	} catch (error) {
		console.error('Error in GET /api/content:', error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Failed to fetch content',
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/content
 * Create new content item (submission or direct schedule)
 *
 * Request body:
 * {
 *   source: 'submission' | 'direct',
 *   mediaUrl: string,
 *   mediaType: 'IMAGE' | 'VIDEO',
 *   title?: string,
 *   caption?: string,
 *   userTags?: [{username, x, y}],
 *   hashtags?: string[],
 *   scheduledTime?: number (only for direct),
 *   storagePath?: string,
 *   dimensions?: {width, height},
 *   thumbnailUrl?: string (for videos),
 *   videoDuration?: number (for videos),
 *   videoCodec?: string (for videos),
 *   videoFramerate?: number (for videos),
 *   needsProcessing?: boolean (for videos),
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
		const userEmail = session.user?.email || '';
		const role = getUserRole(session);

		// Parse request body
		const body = await req.json();
		const {
			source,
			mediaUrl,
			mediaType,
			title,
			caption,
			userTags,
			hashtags,
			scheduledTime,
			storagePath,
			dimensions,
			thumbnailUrl,
			videoDuration,
			videoCodec,
			videoFramerate,
			needsProcessing,
		} = body;

		// Validate required fields
		if (!source || !mediaUrl || !mediaType) {
			return NextResponse.json(
				{ error: 'Missing required fields: source, mediaUrl, mediaType' },
				{ status: 400 },
			);
		}

		// Validate source
		if (source !== 'submission' && source !== 'direct') {
			return NextResponse.json(
				{ error: 'Invalid source. Must be "submission" or "direct"' },
				{ status: 400 },
			);
		}

		// For direct scheduling, require admin role (users use /memes endpoint)
		if (source === 'direct' && role !== 'admin' && role !== 'developer') {
			return NextResponse.json(
				{ error: 'Only admins can create direct scheduled posts' },
				{ status: 403 },
			);
		}

		// Validate caption length
		if (caption && caption.length > 2200) {
			return NextResponse.json(
				{ error: 'Caption exceeds 2200 character limit' },
				{ status: 400 },
			);
		}

		// Create input object
		const input: CreateContentInput = {
			source,
			mediaUrl,
			mediaType: mediaType.toUpperCase() as 'IMAGE' | 'VIDEO',
			title,
			caption,
			userTags,
			hashtags,
			scheduledTime,
			storagePath,
			dimensions,
			thumbnailUrl,
			videoDuration,
			videoCodec,
			videoFramerate,
			needsProcessing,
		};

		// Create content item
		const item = await createContentItem(userId, userEmail, input);

		if (!item) {
			return NextResponse.json(
				{ error: 'Failed to create content item' },
				{ status: 500 },
			);
		}

		return NextResponse.json(
			{ item },
			{ status: 201 },
		);
	} catch (error) {
		console.error('Error in POST /api/content:', error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Failed to create content',
			},
			{ status: 500 },
		);
	}
}
