/**
 * Global cron execution lock to prevent overlapping cron runs.
 * Uses a dedicated cron_locks table for distributed locking.
 */

import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'cron-lock';
const LOCK_NAME = 'process-scheduled';
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Attempt to acquire the global cron lock.
 * Returns true if lock was acquired, false if another execution holds it.
 */
export async function acquireCronLock(): Promise<boolean> {
	const now = new Date();
	const expiresAt = new Date(Date.now() + LOCK_TIMEOUT_MS).toISOString();

	try {
		// Try to insert a new lock row (succeeds if no lock exists)
		const { error: insertError } = await supabaseAdmin
			.from('cron_locks')
			.insert({
				lock_name: LOCK_NAME,
				locked_at: now.toISOString(),
				expires_at: expiresAt,
			});

		if (!insertError) {
			await Logger.info(MODULE, 'Acquired cron lock (new)');
			return true;
		}

		// Lock row exists - try to reclaim if expired (expires_at < now means lock has expired)
		const { data, error: updateError } = await supabaseAdmin
			.from('cron_locks')
			.update({
				locked_at: now.toISOString(),
				expires_at: expiresAt,
			})
			.eq('lock_name', LOCK_NAME)
			.lt('expires_at', now.toISOString())
			.select('lock_name')
			.maybeSingle();

		if (!updateError && data) {
			await Logger.info(MODULE, 'Acquired cron lock (reclaimed expired)');
			return true;
		}

		await Logger.info(MODULE, 'Cron lock held by another execution, skipping');
		return false;
	} catch (error) {
		// If locking fails entirely, allow execution to avoid blocking all cron runs
		await Logger.warn(MODULE, 'Cron lock check failed, allowing execution', error);
		return true;
	}
}

/**
 * Release the global cron lock after processing completes.
 */
export async function releaseCronLock(): Promise<void> {
	try {
		await supabaseAdmin
			.from('cron_locks')
			.delete()
			.eq('lock_name', LOCK_NAME);
	} catch (error) {
		await Logger.warn(MODULE, 'Failed to release cron lock', error);
	}
}
