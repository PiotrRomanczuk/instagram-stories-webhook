import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import { getFacebookAccessToken, getInstagramUserId } from '@/lib/database/linked-accounts';
import axios from 'axios';

const GRAPH_API_BASE = 'https://graph.facebook.com/v24.0';

/**
 * DEBUG ENDPOINT: Fetch recent stories from Instagram
 * GET /api/debug/stories
 *
 * Returns the list of stories posted in the last 24 hours
 */
export async function GET() {
	// Block in production
	if (process.env.NODE_ENV === 'production') {
		return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
	}

	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		if (!isAdmin(session)) {
			return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
		}

		const accessToken = await getFacebookAccessToken(session.user.id);
		if (!accessToken) {
			return NextResponse.json({ error: 'No Facebook connection' }, { status: 400 });
		}

		const igUserId = await getInstagramUserId(session.user.id);
		if (!igUserId) {
			return NextResponse.json({ error: 'No Instagram account linked' }, { status: 400 });
		}

		// Fetch stories from Instagram Graph API
		const storiesRes = await axios.get(`${GRAPH_API_BASE}/${igUserId}/stories`, {
			params: {
				fields: 'id,media_type,media_url,thumbnail_url,timestamp,permalink',
				access_token: accessToken,
			},
		});

		const stories = storiesRes.data.data || [];

		return NextResponse.json({
			success: true,
			igUserId,
			storiesCount: stories.length,
			stories: stories.map((story: {
				id: string;
				media_type: string;
				media_url?: string;
				thumbnail_url?: string;
				timestamp: string;
				permalink?: string;
			}) => ({
				id: story.id,
				mediaType: story.media_type,
				mediaUrl: story.media_url,
				thumbnailUrl: story.thumbnail_url,
				timestamp: story.timestamp,
				permalink: story.permalink,
			})),
		});
	} catch (error: unknown) {
		const errorMessage = axios.isAxiosError(error)
			? error.response?.data?.error?.message || error.message
			: error instanceof Error
				? error.message
				: 'Unknown error';

		return NextResponse.json({
			success: false,
			error: errorMessage,
		}, { status: 500 });
	}
}
