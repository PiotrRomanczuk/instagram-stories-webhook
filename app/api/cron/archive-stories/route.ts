/**
 * Story Archive Cron Endpoint
 *
 * Downloads active Instagram stories and stores them locally before they expire (24h).
 * Also triggers engagement metrics fetch for recently archived stories.
 * Runs every 4 hours.
 *
 * GET /api/cron/archive-stories
 */

import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils/logger';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getAllLinkedAccounts } from '@/lib/database/linked-accounts';
import { fetchAndArchiveStories, ArchiveResult } from '@/lib/instagram/story-archive';
import { fetchEngagementForArchivedStories } from '@/lib/instagram/story-engagement';

const MODULE = 'cron:archive-stories';
const LOCK_NAME = 'archive-stories';
const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export const dynamic = 'force-dynamic';

async function acquireLock(): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(Date.now() + LOCK_TIMEOUT_MS).toISOString();

    try {
        const { error: insertError } = await supabaseAdmin
            .from('cron_locks')
            .insert({
                lock_name: LOCK_NAME,
                locked_at: now.toISOString(),
                expires_at: expiresAt,
            });

        if (!insertError) return true;

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

        if (!updateError && data) return true;

        return false;
    } catch {
        return false;
    }
}

async function releaseLock(): Promise<void> {
    try {
        await supabaseAdmin
            .from('cron_locks')
            .delete()
            .eq('lock_name', LOCK_NAME);
    } catch {
        // Best-effort release
    }
}

export async function GET(req: NextRequest) {
    try {
        // Verify authorization
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            Logger.error(MODULE, 'CRON_SECRET not configured');
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            Logger.warn(MODULE, 'Unauthorized cron request');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Skip if disabled
        if (process.env.DISABLE_CRON === 'true') {
            return NextResponse.json({ message: 'Cron disabled', skipped: true });
        }

        // Acquire distributed lock
        const lockAcquired = await acquireLock();
        if (!lockAcquired) {
            Logger.info(MODULE, 'Archive lock held by another execution, skipping');
            return NextResponse.json({ message: 'Another archive run in progress', skipped: true });
        }

        try {
            Logger.info(MODULE, 'Starting story archive cron job');

            // Get all users with linked Instagram accounts
            const accounts = await getAllLinkedAccounts();

            if (accounts.length === 0) {
                Logger.info(MODULE, 'No linked accounts found, nothing to archive');
                return NextResponse.json({ message: 'No linked accounts', results: [] });
            }

            const results: ArchiveResult[] = [];

            for (const account of accounts) {
                try {
                    const archiveResult = await fetchAndArchiveStories(account.user_id);
                    results.push(archiveResult);

                    // Fetch engagement insights while stories are still active (24h window)
                    const engagementResult = await fetchEngagementForArchivedStories(account.user_id);
                    Logger.info(MODULE, `Engagement: ${engagementResult.storiesUpdated} updated for user ${account.user_id}`);
                } catch (err) {
                    Logger.error(MODULE, `Archive failed for user ${account.user_id}`, err);
                    results.push({
                        userId: account.user_id,
                        totalFetched: 0,
                        newlyArchived: 0,
                        alreadyArchived: 0,
                        failed: 0,
                        errors: [err instanceof Error ? err.message : 'Unknown error'],
                    });
                }
            }

            const summary = {
                accountsProcessed: accounts.length,
                totalArchived: results.reduce((sum, r) => sum + r.newlyArchived, 0),
                totalSkipped: results.reduce((sum, r) => sum + r.alreadyArchived, 0),
                totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
            };

            Logger.info(MODULE, 'Story archive cron complete', summary);

            return NextResponse.json({
                success: true,
                ...summary,
                results,
                timestamp: new Date().toISOString(),
            });
        } finally {
            await releaseLock();
        }
    } catch (error) {
        Logger.error(MODULE, 'Story archive cron failed', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 },
        );
    }
}
