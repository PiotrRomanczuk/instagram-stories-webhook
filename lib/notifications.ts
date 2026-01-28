import { supabaseAdmin } from './config/supabase-admin';
import { Logger } from './utils/logger';

const MODULE = 'lib:notifications';

export type NotificationType =
	| 'meme_approved'
	| 'meme_rejected'
	| 'meme_scheduled'
	| 'meme_published'
	| 'system';

export interface Notification {
	id: string;
	user_id: string;
	type: NotificationType;
	title: string;
	message: string | null;
	related_type: string | null;
	related_id: string | null;
	read_at: string | null;
	created_at: string;
}

/**
 * Create a new notification for a user
 */
export async function createNotification(params: {
	userId: string;
	type: NotificationType;
	title: string;
	message?: string;
	relatedType?: string;
	relatedId?: string;
}): Promise<Notification | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('notifications')
			.insert({
				user_id: params.userId,
				type: params.type,
				title: params.title,
				message: params.message || null,
				related_type: params.relatedType || null,
				related_id: params.relatedId || null,
			})
			.select()
			.single();

		if (error) {
			Logger.error(
				MODULE,
				`Error creating notification: ${error.message}`,
				error,
			);
			return null;
		}

		return data as Notification;
	} catch (error) {
		Logger.error(MODULE, 'Exception in createNotification', error);
		return null;
	}
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
	try {
		const { count, error } = await supabaseAdmin
			.from('notifications')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', userId)
			.is('read_at', null);

		if (error) {
			Logger.error(
				MODULE,
				`Error getting unread count: ${error.message}`,
				error,
			);
			return 0;
		}

		return count || 0;
	} catch (error) {
		Logger.error(MODULE, 'Exception in getUnreadCount', error);
		return 0;
	}
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
	userId: string,
): Promise<boolean> {
	try {
		const { error } = await supabaseAdmin
			.from('notifications')
			.update({ read_at: new Date().toISOString() })
			.eq('user_id', userId)
			.is('read_at', null);

		if (error) {
			Logger.error(
				MODULE,
				`Error marking notifications as read: ${error.message}`,
				error,
			);
			return false;
		}

		return true;
	} catch (error) {
		Logger.error(MODULE, 'Exception in markAllNotificationsAsRead', error);
		return false;
	}
}

/**
 * Mark a specific notification as read
 */
export async function markNotificationAsRead(
	notificationId: string,
	userId: string,
): Promise<boolean> {
	try {
		const { error } = await supabaseAdmin
			.from('notifications')
			.update({ read_at: new Date().toISOString() })
			.eq('id', notificationId)
			.eq('user_id', userId);

		if (error) {
			Logger.error(
				MODULE,
				`Error marking notification ${notificationId} as read: ${error.message}`,
				error,
			);
			return false;
		}

		return true;
	} catch (error) {
		Logger.error(MODULE, 'Exception in markNotificationAsRead', error);
		return false;
	}
}
