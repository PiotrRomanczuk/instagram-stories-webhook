/**
 * TikTok Pipeline Cron
 *
 * Fully automated weekly pipeline that chains all 4 features:
 * 1. Archive new Instagram stories
 * 2. Fetch engagement metrics
 * 3. Compose video from top stories + audio
 * 4. Publish to TikTok
 *
 * GET /api/cron/tiktok-pipeline
 */

import { Logger } from '@/lib/utils/logger';
import { getAllLinkedAccounts } from '@/lib/database/linked-accounts';
import { fetchAndArchiveStories } from '@/lib/instagram/story-archive';
import { fetchEngagementForArchivedStories } from '@/lib/instagram/story-engagement';
import { composeVideoFromTopStories } from '@/lib/jobs/compose-video';
import { getLinkedTikTokAccount } from '@/lib/tiktok/auth';
import { publishVideoToTikTok } from '@/lib/tiktok/publish';
import { updateTikTokPublishStatus } from '@/lib/database/composed-videos';
import { countActiveAudioTracks } from '@/lib/database/audio-tracks';
import { createCronHandler } from '@/lib/scheduler/cron-handler';

const MODULE = 'cron:tiktok-pipeline';

export const dynamic = 'force-dynamic';

export const GET = createCronHandler(
    {
        module: MODULE,
        lockName: 'tiktok-pipeline',
        lockTimeoutMs: 15 * 60 * 1000,
        skipOnPreview: false,
        envKillSwitch: 'TIKTOK_PIPELINE_ENABLED',
        envKillSwitchSkippedMessage: 'TikTok pipeline disabled',
    },
    async () => {
        Logger.info(MODULE, 'Starting TikTok pipeline');

        const accounts = await getAllLinkedAccounts();
        const pipelineResults: Record<string, unknown>[] = [];

        for (const account of accounts) {
            const userId = account.user_id;
            const userResult: Record<string, unknown> = { userId };

            try {
                Logger.info(MODULE, `[${userId}] Step 1: Archiving stories`);
                const archiveResult = await fetchAndArchiveStories(userId);
                userResult.archived = archiveResult.newlyArchived;

                Logger.info(MODULE, `[${userId}] Step 2: Fetching engagement`);
                const engagementResult = await fetchEngagementForArchivedStories(userId);
                userResult.engagementUpdated = engagementResult.storiesUpdated;

                const audioCount = await countActiveAudioTracks();
                if (audioCount === 0) {
                    Logger.warn(MODULE, `[${userId}] No audio tracks available, skipping composition`);
                    userResult.compositionSkipped = 'no_audio_tracks';
                    pipelineResults.push(userResult);
                    continue;
                }

                Logger.info(MODULE, `[${userId}] Step 3: Composing video`);
                const composeResult = await composeVideoFromTopStories(userId);
                userResult.composedVideoId = composeResult.composedVideoId;
                userResult.videoDuration = composeResult.durationSeconds;

                const tiktokAccount = await getLinkedTikTokAccount(userId);
                if (!tiktokAccount) {
                    Logger.warn(MODULE, `[${userId}] No TikTok account linked, skipping publish`);
                    userResult.publishSkipped = 'no_tiktok_account';
                    pipelineResults.push(userResult);
                    continue;
                }

                Logger.info(MODULE, `[${userId}] Step 4: Publishing to TikTok`);
                await updateTikTokPublishStatus(composeResult.composedVideoId, 'uploading');

                const publishResult = await publishVideoToTikTok(composeResult.outputPath, userId);

                if (publishResult.status === 'published') {
                    await updateTikTokPublishStatus(
                        composeResult.composedVideoId,
                        'published',
                        publishResult.publishId,
                    );
                    userResult.tiktokStatus = 'published';
                    userResult.tiktokPostId = publishResult.postId;
                } else {
                    await updateTikTokPublishStatus(
                        composeResult.composedVideoId,
                        'failed',
                        publishResult.publishId,
                        publishResult.error,
                    );
                    userResult.tiktokStatus = 'failed';
                    userResult.tiktokError = publishResult.error;
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                Logger.error(MODULE, `Pipeline failed for user ${userId}: ${msg}`, err);
                userResult.error = msg;
            }

            pipelineResults.push(userResult);
        }

        Logger.info(MODULE, `TikTok pipeline complete for ${accounts.length} accounts`);

        return {
            success: true,
            accountsProcessed: accounts.length,
            results: pipelineResults,
            timestamp: new Date().toISOString(),
        };
    },
);
