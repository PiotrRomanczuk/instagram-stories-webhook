import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

/**
 * GET /api/test/videos
 *
 * Fetches all VIDEO type content items from Supabase for testing video player implementations.
 * This is a test endpoint - only accessible in development or for authenticated users.
 */
export async function GET() {
	try {
		const { data: videos, error } = await supabaseAdmin
			.from('content_items')
			.select('id, media_url, storage_path, thumbnail_url, video_duration, video_codec, video_framerate, created_at, publishing_status, dimensions')
			.eq('media_type', 'VIDEO')
			.order('created_at', { ascending: false })
			.limit(20);

		if (error) {
			console.error('[test/videos] Database error:', error);
			return NextResponse.json(
				{ error: 'Failed to fetch videos', details: error.message },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			videos: videos || [],
			count: videos?.length || 0,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('[test/videos] Unexpected error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
