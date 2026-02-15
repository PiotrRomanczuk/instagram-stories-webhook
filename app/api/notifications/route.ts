import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import { getUserId } from '@/lib/auth-helpers';
import {
	markAllNotificationsAsRead,
	markNotificationAsRead,
} from '@/lib/notifications';

const MODULE = 'api:notifications';

/**
 * GET /api/notifications - Fetch user's notifications
 */
export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = getUserId(session);
		const { searchParams } = new URL(req.url);
		const unreadOnly = searchParams.get('unread') === 'true';
		const limit = parseInt(searchParams.get('limit') || '20', 10);

		let query = supabaseAdmin
			.from('notifications')
			.select('id, user_id, type, title, message, related_type, related_id, read_at, created_at')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.limit(limit);

		if (unreadOnly) {
			query = query.is('read_at', null);
		}

		const { data, error } = await query;

		if (error) {
			Logger.error(
				MODULE,
				`Error fetching notifications: ${error.message}`,
				error,
			);
			return NextResponse.json(
				{ error: 'Failed to fetch notifications' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ notifications: data });
	} catch (error) {
		Logger.error(MODULE, 'GET error', error);
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 },
		);
	}
}

/**
 * PUT /api/notifications - Mark notifications as read
 */
export async function PUT(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = getUserId(session);
		const body = await req.json();
		const { notificationId, all } = body;

		let success = false;
		if (all) {
			success = await markAllNotificationsAsRead(userId);
		} else if (notificationId) {
			success = await markNotificationAsRead(notificationId, userId);
		} else {
			return NextResponse.json(
				{ error: 'Missing notificationId or all flag' },
				{ status: 400 },
			);
		}

		if (!success) {
			return NextResponse.json(
				{ error: 'Failed to update notification status' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		Logger.error(MODULE, 'PUT error', error);
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 },
		);
	}
}
