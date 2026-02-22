/**
 * GET /api/admin/auth-events
 * Returns recent authentication events. Admin/developer only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { rateLimiter } from '@/lib/middleware/rate-limit';

const API_RATE_LIMIT = { limit: 60, windowMs: 60 * 1000 };

export async function GET(req: NextRequest) {
	const rateCheck = rateLimiter(req, API_RATE_LIMIT);
	if (rateCheck.isRateLimited) return rateCheck.response!;

	const session = await getServerSession(authOptions);
	if (!session) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const role = getUserRole(session);
	if (role !== 'admin' && role !== 'developer') {
		return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
	}

	const { searchParams } = new URL(req.url);
	const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
	const offset = parseInt(searchParams.get('offset') ?? '0');
	const outcome = searchParams.get('outcome'); // 'granted' | 'denied'

	let query = supabaseAdmin
		.from('auth_events')
		.select('id, created_at, email, provider, outcome, deny_reason, role', { count: 'exact' })
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (outcome === 'granted' || outcome === 'denied') {
		query = query.eq('outcome', outcome);
	}

	const { data, error, count } = await query;

	if (error) {
		return NextResponse.json({ error: 'Failed to fetch auth events' }, { status: 500 });
	}

	return NextResponse.json({
		items: data ?? [],
		pagination: { total: count ?? 0, offset, limit, hasMore: (count ?? 0) > offset + limit },
	});
}
