/**
 * Reschedule Overdue Posts API
 * POST /api/content/reschedule-overdue - Bulk reschedule overdue posts with individual times
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRole, getUserId } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getCurrentEnvironment } from '@/lib/content-db/environment';
import { rateLimiter } from '@/lib/middleware/rate-limit';
import { preventWriteForDemo } from '@/lib/preview-guard';

const API_RATE_LIMIT = { limit: 20, windowMs: 60 * 1000 };

interface RescheduleItem {
	id: string;
	scheduledTime: number;
}

/**
 * POST /api/content/reschedule-overdue
 * Reschedule overdue posts with individual times (for drag-and-drop reordering)
 *
 * Request body:
 * {
 *   items: [{ id: string, scheduledTime: number }, ...]
 * }
 */
export async function POST(req: NextRequest) {
	const rateCheck = rateLimiter(req, API_RATE_LIMIT);
	if (rateCheck.isRateLimited) return rateCheck.response!;

	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const demoGuard = preventWriteForDemo(session);
		if (demoGuard) return demoGuard;

		const userId = getUserId(session);
		const role = getUserRole(session);
		const userEmail = session.user?.email || '';

		// Admin-only endpoint
		if (role !== 'admin' && role !== 'developer') {
			return NextResponse.json(
				{ error: 'Only admins can reschedule overdue posts' },
				{ status: 403 },
			);
		}

		// Parse request body
		const body = await req.json();
		const { items } = body as { items: RescheduleItem[] };

		// Validate input
		if (!Array.isArray(items) || items.length === 0) {
			return NextResponse.json(
				{ error: 'items must be a non-empty array of { id, scheduledTime }' },
				{ status: 400 },
			);
		}

		if (items.length > 100) {
			return NextResponse.json(
				{ error: 'Cannot reschedule more than 100 items at once' },
				{ status: 400 },
			);
		}

		// Validate each item
		const now = Date.now();
		for (const item of items) {
			if (!item.id || typeof item.scheduledTime !== 'number') {
				return NextResponse.json(
					{ error: 'Each item must have id and scheduledTime' },
					{ status: 400 },
				);
			}

			if (item.scheduledTime <= now) {
				return NextResponse.json(
					{ error: 'All scheduled times must be in the future' },
					{ status: 400 },
				);
			}
		}

		// Check for duplicate times (Instagram doesn't allow simultaneous posts)
		const times = items.map((i) => i.scheduledTime);
		const uniqueTimes = new Set(times);
		if (uniqueTimes.size !== times.length) {
			return NextResponse.json(
				{ error: 'Each post must have a unique scheduled time' },
				{ status: 400 },
			);
		}

		// Update each post individually
		let updated = 0;
		const errors: string[] = [];

		for (const item of items) {
			const { error } = await supabaseAdmin
				.from('content_items')
				.update({
					scheduled_time: item.scheduledTime,
					publishing_status: 'scheduled',
					updated_at: new Date().toISOString(),
				})
				.eq('id', item.id)
				.eq('environment', getCurrentEnvironment())
				.eq('publishing_status', 'scheduled'); // Only update scheduled posts

			if (error) {
				console.error(`Error updating post ${item.id}:`, error);
				errors.push(item.id);
			} else {
				updated++;
			}
		}

		// Log action
		console.log(
			`[Reschedule] ${updated}/${items.length} overdue posts rescheduled by ${userEmail}`,
		);

		if (errors.length > 0) {
			return NextResponse.json({
				data: { updated, failed: errors.length },
				message: `${updated} post(s) rescheduled, ${errors.length} failed`,
				errors,
			});
		}

		return NextResponse.json({
			data: { updated },
			message: `${updated} overdue post(s) rescheduled successfully`,
		});
	} catch (error) {
		console.error('Error in POST /api/content/reschedule-overdue:', error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Reschedule operation failed',
			},
			{ status: 500 },
		);
	}
}
