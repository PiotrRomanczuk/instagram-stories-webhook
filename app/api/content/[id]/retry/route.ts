/**
 * POST /api/content/[id]/retry
 * Retry a failed post by resetting it to scheduled status.
 * Admin/developer only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { getContentItemById } from '@/lib/content-db';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getCurrentEnvironment } from '@/lib/content-db/environment';
import { rateLimiter } from '@/lib/middleware/rate-limit';

const API_RATE_LIMIT = { limit: 30, windowMs: 60 * 1000 };

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

		const role = getUserRole(session);
		if (role !== 'admin' && role !== 'developer') {
			return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
		}

		const item = await getContentItemById(id);
		if (!item) {
			return NextResponse.json({ error: 'Content item not found' }, { status: 404 });
		}

		if (item.publishingStatus !== 'failed') {
			return NextResponse.json(
				{ error: 'Only failed posts can be retried' },
				{ status: 400 },
			);
		}

		const { error: updateError } = await supabaseAdmin
			.from('content_items')
			.update({
				publishing_status: 'scheduled',
				error: null,
				retry_count: 0,
				processing_started_at: null,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.eq('environment', getCurrentEnvironment());

		if (updateError) {
			console.error('Error retrying content item:', updateError);
			return NextResponse.json(
				{ error: 'Failed to retry content item' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ message: 'Post queued for retry' });
	} catch (error) {
		console.error('Error in POST /api/content/[id]/retry:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Failed to retry' },
			{ status: 500 },
		);
	}
}
