import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
	getMemeSubmissions,
	createMemeSubmission,
	getMemeStats,
	countRecentSubmissions,
} from '@/lib/memes-db';
import { getUserRole, getUserId } from '@/lib/auth-helpers';
import { submitMemeSchema } from '@/lib/validations/meme.schema';
import { MemeStatus } from '@/lib/types';
import { validateMediaUrl } from '@/lib/media/server-validator';
import { rateLimiter } from '@/lib/middleware/rate-limit';

const API_RATE_LIMIT = { limit: 100, windowMs: 60 * 1000 };

export async function GET(req: NextRequest) {
	// Rate check
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
		const status = searchParams.get('status') || undefined;
		const search = searchParams.get('search') || undefined;
	const sort = searchParams.get('sort') || 'newest';
	const dateFrom = searchParams.get('dateFrom') || undefined;
	const dateTo = searchParams.get('dateTo') || undefined;
	const userEmail = searchParams.get('userEmail') || undefined;
		const page = parseInt(searchParams.get('page') || '1', 10);
		const limit = parseInt(searchParams.get('limit') || '12', 10);
		const offset = (page - 1) * limit;

		const options: {
			status?: MemeStatus | MemeStatus[];
			userId?: string;
			search?: string;
			limit?: number;
			offset?: number;
		} = {
			status: (status as MemeStatus) || undefined,
			search,
			limit,
			offset,
		};

		if (role !== 'admin' && role !== 'developer') {
			options.userId = userId;
		}

		const memes = await getMemeSubmissions(options);
		const stats =
			role === 'admin' || role === 'developer' ? await getMemeStats() : null;

		return NextResponse.json({
			memes,
			stats,
			pagination: {
				page,
				limit,
				hasMore: memes.length === limit,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Failed to fetch memes',
			},
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	// Global rate check
	const rateCheck = rateLimiter(req, API_RATE_LIMIT);
	if (rateCheck.isRateLimited) return rateCheck.response!;

	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = getUserId(session);
		const userEmail = session.user?.email || '';

		// Rate limiting: 90 per hour, 90 per day
		const HOURLY_LIMIT = 90;
		const DAILY_LIMIT = 90;

		const hourlyCount = await countRecentSubmissions(userId, 60 * 60 * 1000);
		if (hourlyCount >= HOURLY_LIMIT) {
			return NextResponse.json(
				{
					error: `Rate limit exceeded. You can submit maximum ${HOURLY_LIMIT} memes per hour.`,
				},
				{ status: 429 },
			);
		}

		const dailyCount = await countRecentSubmissions(
			userId,
			24 * 60 * 60 * 1000,
		);
		if (dailyCount >= DAILY_LIMIT) {
			return NextResponse.json(
				{
					error: `Daily limit reached. You can submit maximum ${DAILY_LIMIT} memes per day.`,
				},
				{ status: 429 },
			);
		}

		const body = await req.json();
		const validated = submitMemeSchema.parse(body);

		// Perform server-side validation of the media URL
		const validation = await validateMediaUrl(validated.mediaUrl);
		if (!validation.valid) {
			return NextResponse.json(
				{
					error: 'Media validation failed',
					details: validation.error,
				},
				{ status: 400 },
			);
		}

		const meme = await createMemeSubmission({
			user_id: userId,
			user_email: userEmail,
			media_url: validated.mediaUrl,
			storage_path: validated.storagePath,
			title: validated.title,
			caption: validated.caption,
		});

		if (!meme) {
			return NextResponse.json(
				{ error: 'Failed to create meme' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ meme });
	} catch (error) {
		console.error('POST /api/memes error:', error);
		if (error instanceof Error && error.name === 'ZodError') {
			return NextResponse.json(
				{ error: 'Validation failed', details: error },
				{ status: 400 },
			);
		}
		// Handle duplicate meme error with 409 Conflict status
		if (error instanceof Error && error.message === 'DUPLICATE_MEME') {
			return NextResponse.json(
				{ error: 'DUPLICATE_MEME' },
				{ status: 409 },
			);
		}
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Internal Server Error',
			},
			{ status: 500 },
		);
	}
}
