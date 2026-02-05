/**
 * Publishing Logs API
 * Provides public access to publishing logs with proper authentication and authorization
 *
 * GET /api/publishing-logs - List publishing logs with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserId, getUserRole } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { rateLimiter } from '@/lib/middleware/rate-limit';
import {
	PublishingLogRow,
	mapPublishingLogRow,
	PublishingLog,
} from '@/lib/types/posts';

const API_RATE_LIMIT = { limit: 100, windowMs: 60 * 1000 };

/**
 * GET /api/publishing-logs
 * List publishing logs with filters
 *
 * Query Parameters:
 * - limit: Max 100, default 10
 * - offset: Default 0
 * - status: Optional filter ('SUCCESS' or 'FAILED')
 * - userId: Admin-only, filter by specific user
 */
export async function GET(req: NextRequest) {
	const rateCheck = rateLimiter(req, API_RATE_LIMIT);
	if (rateCheck.isRateLimited) return rateCheck.response!;

	try {
		// Authentication: Require valid session
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = getUserId(session);
		const role = getUserRole(session);
		const { searchParams } = new URL(req.url);

		// Parse query parameters
		const limitParam = searchParams.get('limit');
		const offsetParam = searchParams.get('offset');
		const statusParam = searchParams.get('status');
		const userIdParam = searchParams.get('userId');

		// Validate and set defaults
		const limit = Math.min(
			limitParam ? parseInt(limitParam, 10) : 10,
			100
		);
		const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

		// Validate status parameter
		if (statusParam && statusParam !== 'SUCCESS' && statusParam !== 'FAILED') {
			return NextResponse.json(
				{ error: 'Invalid status. Must be "SUCCESS" or "FAILED"' },
				{ status: 400 }
			);
		}

		// Authorization: Check if userId filter is admin-only
		const isAdmin = role === 'admin' || role === 'developer';
		if (userIdParam && !isAdmin) {
			return NextResponse.json(
				{ error: 'Only admins can filter by userId' },
				{ status: 403 }
			);
		}

		// Build query
		let query = supabaseAdmin
			.from('publishing_logs')
			.select('*', { count: 'exact' });

		// Apply filters
		// Authorization: Users see their own logs, admins see all logs
		if (!isAdmin) {
			query = query.eq('user_id', userId);
		} else if (userIdParam) {
			// Admin filtering by specific user
			query = query.eq('user_id', userIdParam);
		}

		if (statusParam) {
			query = query.eq('status', statusParam);
		}

		// Apply ordering (most recent first)
		query = query.order('created_at', { ascending: false });

		// Apply pagination
		query = query.range(offset, offset + limit - 1);

		// Execute query
		const { data, error, count } = await query;

		if (error) {
			console.error('Error fetching publishing logs:', error);
			return NextResponse.json(
				{ error: 'Failed to fetch publishing logs' },
				{ status: 500 }
			);
		}

		// Map database rows to PublishingLog objects
		const items: PublishingLog[] = (data as PublishingLogRow[]).map(
			mapPublishingLogRow
		);

		// Return response following project convention (use 'items', not 'data')
		return NextResponse.json({
			items,
			pagination: {
				total: count || 0,
				offset,
				limit,
				hasMore: (count || 0) > offset + limit,
			},
		});
	} catch (error) {
		console.error('Error in GET /api/publishing-logs:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Failed to fetch publishing logs',
			},
			{ status: 500 }
		);
	}
}
