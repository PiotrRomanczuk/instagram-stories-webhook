/**
 * Distributed cron execution lock to prevent overlapping cron runs.
 * Uses the cron_locks table; one row per lock name.
 */

import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'cron-lock';
const DEFAULT_LOCK_NAME = 'process-scheduled';
const DEFAULT_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

export async function acquireCronLock(
    lockName: string = DEFAULT_LOCK_NAME,
    timeoutMs: number = DEFAULT_LOCK_TIMEOUT_MS,
): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(Date.now() + timeoutMs).toISOString();

    try {
        const { error: insertError } = await supabaseAdmin
            .from('cron_locks')
            .insert({
                lock_name: lockName,
                locked_at: now.toISOString(),
                expires_at: expiresAt,
            });

        if (!insertError) {
            await Logger.info(MODULE, `Acquired cron lock '${lockName}' (new)`);
            return true;
        }

        const { data, error: updateError } = await supabaseAdmin
            .from('cron_locks')
            .update({
                locked_at: now.toISOString(),
                expires_at: expiresAt,
            })
            .eq('lock_name', lockName)
            .lt('expires_at', now.toISOString())
            .select('lock_name')
            .maybeSingle();

        if (!updateError && data) {
            await Logger.info(MODULE, `Acquired cron lock '${lockName}' (reclaimed expired)`);
            return true;
        }

        await Logger.info(MODULE, `Cron lock '${lockName}' held by another execution, skipping`);
        return false;
    } catch (error) {
        await Logger.warn(MODULE, `Cron lock '${lockName}' check failed, refusing execution (fail-closed)`, error);
        return false;
    }
}

export async function releaseCronLock(lockName: string = DEFAULT_LOCK_NAME): Promise<void> {
    try {
        await supabaseAdmin
            .from('cron_locks')
            .delete()
            .eq('lock_name', lockName);
    } catch (error) {
        await Logger.warn(MODULE, `Failed to release cron lock '${lockName}'`, error);
    }
}
