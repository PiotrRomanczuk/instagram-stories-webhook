/**
 * Admin alert system: sends in-app notifications to all admin/developer users
 * when critical system events occur.
 *
 * Used for:
 *   - Publishing permanently failed (after max retries)
 *   - Instagram token expiring within 7 days or already expired
 *   - API quota usage above 80%
 */

import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from './logger';

const MODULE = 'admin-alerts';

/** Fetch the NextAuth user IDs of all admin and developer accounts. */
async function getAdminUserIds(): Promise<string[]> {
	try {
		const { data: whitelist, error } = await supabaseAdmin
			.from('email_whitelist')
			.select('email')
			.in('role', ['admin', 'developer']);

		if (error || !whitelist || whitelist.length === 0) return [];

		const emails = whitelist.map((w) => w.email.toLowerCase());

		const { data: users } = await supabaseAdmin
			.schema('next_auth')
			.from('users')
			.select('id, email')
			.in('email', emails);

		return (users ?? []).map((u) => u.id);
	} catch {
		return [];
	}
}

async function createAdminNotifications(
	title: string,
	message: string,
	type: string,
	relatedId?: string,
): Promise<void> {
	const adminIds = await getAdminUserIds();
	if (adminIds.length === 0) {
		await Logger.warn(MODULE, 'No admin user IDs found — alert not delivered', { title });
		return;
	}

	const rows = adminIds.map((userId) => ({
		user_id: userId,
		type,
		title,
		message,
		related_type: relatedId ? 'system' : null,
		related_id: relatedId ?? null,
	}));

	const { error } = await supabaseAdmin.from('notifications').insert(rows);
	if (error) {
		await Logger.warn(MODULE, `Failed to insert admin notifications: ${error.message}`);
	}
}

/**
 * Alert admins that a content item has permanently failed publishing.
 */
export async function alertPublishFailure(
	postId: string,
	errorMessage: string,
	retryCount: number,
): Promise<void> {
	try {
		await Logger.warn(MODULE, `🚨 Alerting admins: publish failure for post ${postId}`);
		await createAdminNotifications(
			'Publishing Failed',
			`Post ${postId} permanently failed after ${retryCount} attempts: ${errorMessage}`,
			'system',
			postId,
		);
	} catch (err) {
		await Logger.warn(MODULE, 'Failed to send publish failure alert', err);
	}
}

/**
 * Alert admins that an Instagram token is expiring soon or has expired.
 */
export async function alertTokenExpiry(
	igUsername: string,
	expiresAt: number,
	daysRemaining: number,
): Promise<void> {
	try {
		const isExpired = daysRemaining <= 0;
		const title = isExpired ? 'Instagram Token Expired' : 'Instagram Token Expiring Soon';
		const message = isExpired
			? `The Instagram token for @${igUsername} has expired. Publishing will fail until renewed.`
			: `The Instagram token for @${igUsername} expires in ${daysRemaining} day(s) (${new Date(expiresAt).toLocaleDateString()}). Please renew it.`;

		await Logger.warn(MODULE, `🚨 Alerting admins: token expiry for @${igUsername}`);
		await createAdminNotifications(title, message, 'system');
	} catch (err) {
		await Logger.warn(MODULE, 'Failed to send token expiry alert', err);
	}
}

/**
 * Alert admins that the Meta API quota is critically high (≥80%).
 */
export async function alertHighQuota(
	quotaUsage: number,
	quotaTotal: number,
	usagePct: number,
): Promise<void> {
	try {
		await Logger.warn(MODULE, `🚨 Alerting admins: high quota usage ${usagePct}%`);
		await createAdminNotifications(
			'API Quota Warning',
			`Meta API quota is at ${usagePct}% (${quotaUsage}/${quotaTotal}). Publishing may be throttled.`,
			'system',
		);
	} catch (err) {
		await Logger.warn(MODULE, 'Failed to send quota alert', err);
	}
}
