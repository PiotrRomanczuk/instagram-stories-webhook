import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMediaDetails } from '@/lib/instagram/media';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:instagram-media';

interface RouteParams {
	params: Promise<{ mediaId: string }>;
}

/**
 * GET /api/instagram/media/[mediaId]
 * Fetches details for a specific Instagram media item by ID
 *
 * @requires Authentication - Valid session with user ID
 * @param mediaId - Instagram media ID from route parameter
 * @returns InstagramStory object or error
 *
 * Response format:
 * - Success (200): { story: InstagramStory }
 * - Unauthorized (401): { error: 'Unauthorized' }
 * - Not Found (404): { error: 'Story not found or expired' }
 * - Server Error (500): { error: string }
 */
export async function GET(
	request: NextRequest,
	{ params }: RouteParams
) {
	try {
		// Verify authentication
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			await Logger.warn(MODULE, 'Unauthorized media fetch attempt');
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		// Extract mediaId from route params
		const { mediaId } = await params;

		if (!mediaId) {
			await Logger.warn(MODULE, 'Missing mediaId parameter');
			return NextResponse.json(
				{ error: 'Media ID is required' },
				{ status: 400 }
			);
		}

		await Logger.info(MODULE, `Fetching media details for ID: ${mediaId}, user: ${session.user.id}`);

		// Fetch media details from Instagram
		const story = await getMediaDetails(mediaId, session.user.id);

		if (!story) {
			await Logger.warn(MODULE, `Story not found or expired: ${mediaId}`);
			return NextResponse.json(
				{ error: 'Story not found or expired' },
				{ status: 404 }
			);
		}

		await Logger.info(MODULE, `Successfully fetched media: ${mediaId} (${story.media_type})`);

		return NextResponse.json({ story });
	} catch (error) {
		await Logger.error(MODULE, 'Error fetching media details:', error);

		const errorMessage = error instanceof Error ? error.message : 'Failed to fetch media details';

		// Check for specific Instagram API errors
		if (errorMessage.includes('expired') || errorMessage.includes('token')) {
			return NextResponse.json(
				{ error: 'Instagram authentication expired. Please reconnect your account.' },
				{ status: 401 }
			);
		}

		if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
			return NextResponse.json(
				{ error: 'Story not found or expired' },
				{ status: 404 }
			);
		}

		return NextResponse.json(
			{ error: errorMessage },
			{ status: 500 }
		);
	}
}
