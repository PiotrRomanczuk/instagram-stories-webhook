/**
 * Story Archive Cron Endpoint
 *
 * Downloads active Instagram stories and stores them locally before they expire (24h).
 * Also triggers engagement metrics fetch for recently archived stories.
 * Runs every 4 hours.
 *
 * GET /api/cron/archive-stories
 */

import { Logger } from '@/lib/utils/logger';
import { getAllLinkedAccounts } from '@/lib/database/linked-accounts';
import { fetchAndArchiveStories, ArchiveResult } from '@/lib/instagram/story-archive';
import { fetchEngagementForArchivedStories } from '@/lib/instagram/story-engagement';
import { createCronHandler } from '@/lib/scheduler/cron-handler';

const MODULE = 'cron:archive-stories';

export const dynamic = 'force-dynamic';

export const GET = createCronHandler(
    {
        module: MODULE,
        lockName: 'archive-stories',
        lockTimeoutMs: 10 * 60 * 1000,
        skipOnPreview: false,
    },
    async () => {
        Logger.info(MODULE, 'Starting story archive cron job');

        const accounts = await getAllLinkedAccounts();
        if (accounts.length === 0) {
            Logger.info(MODULE, 'No linked accounts found, nothing to archive');
            return { message: 'No linked accounts', results: [] };
        }

        const results: ArchiveResult[] = [];
        for (const account of accounts) {
            try {
                results.push(await fetchAndArchiveStories(account.user_id));
                const engagementResult = await fetchEngagementForArchivedStories(account.user_id);
                Logger.info(
                    MODULE,
                    `Engagement: ${engagementResult.storiesUpdated} updated for user ${account.user_id}`,
                );
            } catch (err) {
                Logger.error(MODULE, `Archive failed for user ${account.user_id}`, Logger.safeError(err));
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

        return {
            success: true,
            ...summary,
            results,
            timestamp: new Date().toISOString(),
        };
    },
);
