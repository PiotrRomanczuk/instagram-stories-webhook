import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getRecentStories } from '@/lib/instagram/media';

/**
 * GET /api/instagram/recent-stories
 * Fetches recent Instagram stories for the authenticated user
 */
export async function GET(request: NextRequest) {
	try {
		// Verify authentication
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		// Get limit from query params (default 10)
		const { searchParams } = new URL(request.url);
		const limit = parseInt(searchParams.get('limit') || '10', 10);

		// Fetch recent stories
		const result = await getRecentStories(session.user.id, limit);

		return NextResponse.json(result);
	} catch (error) {
		console.error('Error fetching recent stories:', error);

		const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recent stories';

		return NextResponse.json(
			{ error: errorMessage, stories: [], count: 0 },
			{ status: 500 }
		);
	}
}
