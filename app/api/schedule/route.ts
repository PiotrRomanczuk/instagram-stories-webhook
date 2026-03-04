import { NextRequest, NextResponse } from 'next/server';
import {
	addScheduledPost,
	getScheduledPosts,
	getAllScheduledPosts,
	deleteScheduledPost,
	updateScheduledPost,
} from '@/lib/database/scheduled-posts';
import { checkScheduleConflict } from '@/lib/database/schedule-conflict';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import { rateLimiter } from '@/lib/middleware/rate-limit';
import { preventWriteForDemo } from '@/lib/preview-guard';

// Rate limit config: 60 requests per 1 minute
const API_RATE_LIMIT = { limit: 60, windowMs: 60 * 1000 };

// GET - List all scheduled posts for the current user (or all posts for admins)
export async function GET(request: NextRequest) {
	// Rate check
	const rateCheck = rateLimiter(request, API_RATE_LIMIT);
	if (rateCheck.isRateLimited) return rateCheck.response!;

	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const searchParams = request.nextUrl.searchParams;
		const status = searchParams.get('status');
		const showAll = searchParams.get('all') === 'true';

		// Admins can see all posts if ?all=true is passed
		let posts;
		if (isAdmin(session) && showAll) {
			posts = await getAllScheduledPosts();
		} else {
			posts = await getScheduledPosts(session.user.id);
		}

		// Filter by status if provided
		if (status) {
			posts = posts.filter((p) => p.status === status);
		}

		// Filter to show only:
		// - All pending posts (regardless of age)
		// - Published posts from the last 24 hours
		const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
		posts = posts.filter((p) => {
			if (p.status === 'pending') {
				return true; // Show all pending posts
			}
			// For published/failed posts, only show if within last 24 hours
			return p.scheduledTime >= twentyFourHoursAgo;
		});

		// Sort by scheduled time (earliest first)
		posts.sort((a, b) => a.scheduledTime - b.scheduledTime);

		return NextResponse.json({ posts });
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		console.error('Error fetching scheduled posts:', error);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

// POST - Schedule a new post
export async function POST(request: NextRequest) {
	// Rate check
	const rateCheck = rateLimiter(request, API_RATE_LIMIT);
	if (rateCheck.isRateLimited) return rateCheck.response!;

	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const demoGuard = preventWriteForDemo(session);
		if (demoGuard) return demoGuard;

		const body = await request.json();

		// Import Zod schema
		const { z } = await import('zod');

		// Define server-side validation schema
		const schedulePostSchema = z.object({
			url: z.string().url('Invalid media URL'),
			type: z.enum(['IMAGE', 'VIDEO']),
			postType: z.enum(['STORY']).optional().default('STORY'),
			caption: z
				.string()
				.max(2200, 'Caption cannot exceed 2200 characters')
				.optional()
				.default(''),
			scheduledTime: z
				.string()
				.or(z.number())
				.pipe(z.coerce.date())
				.refine((date) => date.getTime() > Date.now() - 1000 * 60 * 2, {
					// Allow up to 2 mins in past for network latency/immediate schedule
					message: 'scheduledTime cannot be in the past (more than 2 mins)',
				})
				.transform((date) => date.getTime()),
			userTags: z
				.array(
					z.object({
						username: z.string(),
						x: z.number().min(0).max(1),
						y: z.number().min(0).max(1),
					}),
				)
				.max(20, 'Maximum 20 user tags allowed')
				.optional()
				.default([]),
		});

		// Validate request body
		const validationResult = schedulePostSchema.safeParse(body);

		if (!validationResult.success) {
			const errors = validationResult.error.issues.map((err) => ({
				field: err.path.join('.'),
				message: err.message,
			}));
			return NextResponse.json(
				{
					error: 'Validation failed',
					details: errors,
				},
				{ status: 400 },
			);
		}

		const { url, type, postType, caption, scheduledTime, userTags } =
			validationResult.data;

		// Check for scheduling conflicts in the same minute
		const conflict = await checkScheduleConflict(scheduledTime);
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

		const post = await addScheduledPost({
			url,
			type,
			postType,
			caption,
			scheduledTime,
			userTags,
			userId: session.user.id, // Associate with current user
		});

		console.log(
			`📅 Scheduled ${postType} (${type}) post for user ${session.user.id} at ${new Date(scheduledTime).toLocaleString()}`,
		);

		return NextResponse.json({
			success: true,
			post,
			message: `Post scheduled for ${new Date(scheduledTime).toLocaleString()}`,
		});
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		console.error('Error scheduling post:', error);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

// DELETE - Cancel a scheduled post
export async function DELETE(request: NextRequest) {
	// Rate check
	const rateCheck = rateLimiter(request, API_RATE_LIMIT);
	if (rateCheck.isRateLimited) return rateCheck.response!;

	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const demoGuard = preventWriteForDemo(session);
		if (demoGuard) return demoGuard;

		const searchParams = request.nextUrl.searchParams;
		const id = searchParams.get('id');

		if (!id) {
			return NextResponse.json(
				{ error: 'Missing "id" parameter' },
				{ status: 400 },
			);
		}

		// Verify ownership
		const posts = await getScheduledPosts(session.user.id);
		const postExists = posts.some((p) => p.id === id);

		if (!postExists) {
			return NextResponse.json(
				{ error: 'Post not found or unauthorized' },
				{ status: 404 },
			);
		}

		const deleted = await deleteScheduledPost(id);

		if (!deleted) {
			return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
		}

		console.log(
			`🗑️ Cancelled scheduled post: ${id} for user ${session.user.id}`,
		);

		return NextResponse.json({ success: true, message: 'Post cancelled' });
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		console.error('Error cancelling post:', error);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

// PATCH - Update a scheduled post
export async function PATCH(request: NextRequest) {
	// Rate check
	const rateCheck = rateLimiter(request, API_RATE_LIMIT);
	if (rateCheck.isRateLimited) return rateCheck.response!;

	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const demoGuard = preventWriteForDemo(session);
		if (demoGuard) return demoGuard;

		const body = await request.json();

		// Import Zod for validation
		const { z } = await import('zod');

		// Define validation schema for updates (all fields optional except id)
		const updatePostSchema = z.object({
			id: z.string().min(1, 'Post ID is required'),
			url: z.string().url('Invalid media URL').optional(),
			caption: z
				.string()
				.max(2200, 'Caption cannot exceed 2200 characters')
				.optional(),
			scheduledTime: z
				.string()
				.or(z.number())
				.transform((val) => {
					const timestamp =
						typeof val === 'string' ? new Date(val).getTime() : val;
					if (isNaN(timestamp)) {
						throw new Error('Invalid scheduledTime format');
					}
					if (timestamp <= Date.now() - 1000 * 60 * 2) {
						throw new Error(
							'scheduledTime cannot be in the past (more than 2 mins)',
						);
					}
					return timestamp;
				})
				.optional(),
			userTags: z
				.array(
					z.object({
						username: z.string(),
						x: z.number().min(0).max(1),
						y: z.number().min(0).max(1),
					}),
				)
				.max(20, 'Maximum 20 user tags allowed')
				.optional(),
		});

		// Validate request body
		const validationResult = updatePostSchema.safeParse(body);

		if (!validationResult.success) {
			const errors = validationResult.error.issues.map((err) => ({
				field: err.path.join('.'),
				message: err.message,
			}));
			return NextResponse.json(
				{
					error: 'Validation failed',
					details: errors,
				},
				{ status: 400 },
			);
		}

		const { id, ...updates } = validationResult.data;

		// Verify ownership
		const posts = await getScheduledPosts(session.user.id);
		const postExists = posts.some((p) => p.id === id);

		if (!postExists) {
			return NextResponse.json(
				{ error: 'Post not found or unauthorized' },
				{ status: 404 },
			);
		}

		// Check for scheduling conflicts when time is changing
		if (updates.scheduledTime) {
			const conflict = await checkScheduleConflict(updates.scheduledTime, {
				excludeId: id,
				excludeTable: 'scheduled_posts',
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

		// Log updates for debugging
		if (updates.userTags) {
			console.log(`🏷️ Updating tags for post ${id}:`, updates.userTags);
		}

		const post = await updateScheduledPost(id, updates);

		if (!post) {
			return NextResponse.json({ error: 'Post not found' }, { status: 404 });
		}

		console.log(`✏️ Updated scheduled post: ${id} for user ${session.user.id}`);

		return NextResponse.json({ success: true, post });
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		console.error('Error updating post:', error);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
