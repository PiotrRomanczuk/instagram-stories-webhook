import { getLinkedFacebookAccount } from '@/lib/database/linked-accounts';
import { getContentPublishingLimit } from '@/lib/instagram/quota';
import { Logger } from '@/lib/utils/logger';
import type { ContentItem } from '@/lib/types';

const MODULE = 'quota-gate';

export interface QuotaCheckResult {
	allowed: boolean;
	quotaTotal: number;
	quotaUsage: number;
	quotaRemaining: number;
	userId: string;
	igUserId: string;
}

/**
 * Check Meta's content publishing quota before publishing.
 * Fail-open with cap of 1: if the quota API fails, allows 1 publish (not all).
 */
export async function checkPublishingQuota(
	items: ContentItem[],
	safetyMargin: number,
): Promise<QuotaCheckResult> {
	const userId = items[0].userId;

	try {
		const account = await getLinkedFacebookAccount(userId);
		if (!account?.ig_user_id) {
			await Logger.warn(MODULE, `No linked IG account for user ${userId}, fail-open with cap=1`);
			return {
				allowed: true,
				quotaTotal: 1,
				quotaUsage: 0,
				quotaRemaining: 1,
				userId,
				igUserId: 'unknown',
			};
		}

		const quota = await getContentPublishingLimit(account.ig_user_id, userId);
		const total = quota.config?.quota_total ?? 25;
		const usage = quota.quota_usage ?? 0;
		const remaining = Math.max(0, total - usage - safetyMargin);
		const allowed = remaining > 0;

		await Logger.info(
			MODULE,
			`Quota check: ${usage}/${total} used, ${remaining} remaining (margin=${safetyMargin}), allowed=${allowed}`,
		);

		return {
			allowed,
			quotaTotal: total,
			quotaUsage: usage,
			quotaRemaining: remaining,
			userId,
			igUserId: account.ig_user_id,
		};
	} catch (error) {
		await Logger.warn(
			MODULE,
			`Quota check failed for user ${userId}, fail-open with cap=1`,
			error,
		);
		return {
			allowed: true,
			quotaTotal: 1,
			quotaUsage: 0,
			quotaRemaining: 1,
			userId,
			igUserId: 'unknown',
		};
	}
}
