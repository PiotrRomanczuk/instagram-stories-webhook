/**
 * Demo Data Reset API
 * POST /api/demo/reset — Re-seeds demo data for demo@demo.com
 *
 * Only callable by demo users. Rate-limited to 5/min.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { rateLimiter } from '@/lib/middleware/rate-limit';
import { DEMO_EMAIL, buildItems } from '@/lib/demo/seed-items';
import { getCurrentEnvironment } from '@/lib/content-db/environment';

const RATE_LIMIT = { limit: 5, windowMs: 60 * 1000 };

export async function POST(req: NextRequest) {
	const rateCheck = rateLimiter(req, RATE_LIMIT);
	if (rateCheck.isRateLimited) return rateCheck.response!;

	const session = await getServerSession(authOptions);
	if (!session || session.user?.role !== 'demo') {
		return NextResponse.json(
			{ error: 'Only demo users can reset demo data' },
			{ status: 403 },
		);
	}

	// Delete all existing demo content
	const { error: deleteError } = await supabaseAdmin
		.from('content_items')
		.delete()
		.eq('user_email', DEMO_EMAIL);

	if (deleteError) {
		return NextResponse.json(
			{ error: 'Failed to clear demo data' },
			{ status: 500 },
		);
	}

	// Re-insert fresh seed data matching current environment
	const items = buildItems(getCurrentEnvironment());
	const { error: insertError } = await supabaseAdmin
		.from('content_items')
		.insert(items);

	if (insertError) {
		return NextResponse.json(
			{ error: 'Failed to seed demo data' },
			{ status: 500 },
		);
	}

	return NextResponse.json({
		message: 'Demo data reset successfully',
		itemCount: items.length,
	});
}
