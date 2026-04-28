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

import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils/logger';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getAllLinkedAccounts } from '@/lib/database/linked-accounts';
import { fetchAndArchiveStories } from '@/lib/instagram/story-archive';
import { fetchEngagementForArchivedStories } from '@/lib/instagram/story-engagement';
import { composeVideoFromTopStories } from '@/lib/jobs/compose-video';
import { getLinkedTikTokAccount } from '@/lib/tiktok/auth';
import { publishVideoToTikTok } from '@/lib/tiktok/publish';
import { updateTikTokPublishStatus } from '@/lib/database/composed-videos';
import { countActiveAudioTracks } from '@/lib/database/audio-tracks';

const MODULE = 'cron:tiktok-pipeline';
const LOCK_NAME = 'tiktok-pipeline';
const LOCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const dynamic = 'force-dynamic';

async function acquireLock(): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(Date.now() + LOCK_TIMEOUT_MS).toISOString();

    try {
        const { error: insertError } = await supabaseAdmin
            .from('cron_locks')
            .insert({ lock_name: LOCK_NAME, locked_at: now.toISOString(), expires_at: expiresAt });

        if (!insertError) return true;

        const { data } = await supabaseAdmin
            .from('cron_locks')
            .update({ locked_at: now.toISOString(), expires_at: expiresAt })
            .eq('lock_name', LOCK_NAME)
            .lt('expires_at', now.toISOString())
            .select('lock_name')
            .maybeSingle();

        return !!data;
    } catch {
        return false;
    }
}

async function releaseLock(): Promise<void> {
    try {
        await supabaseAdmin.from('cron_locks').delete().eq('lock_name', LOCK_NAME);
    } catch { /* best-effort */ }
}

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Kill switch
        if (process.env.TIKTOK_PIPELINE_ENABLED !== 'true') {
            return NextResponse.json({ message: 'TikTok pipeline disabled', skipped: true });
        }

        if (process.env.DISABLE_CRON === 'true') {
            return NextResponse.json({ message: 'Cron disabled', skipped: true });
        }

        const lockAcquired = await acquireLock();
        if (!lockAcquired) {
            return NextResponse.json({ message: 'Pipeline already running', skipped: true });
        }

        try {
            Logger.info(MODULE, 'Starting TikTok pipeline');

            const accounts = await getAllLinkedAccounts();
            const pipelineResults = [];

            for (const account of accounts) {
                const userId = account.user_id;
                const userResult: Record<string, unknown> = { userId };

                try {
                    // Step 1: Archive stories
                    Logger.info(MODULE, `[${userId}] Step 1: Archiving stories`);
                    const archiveResult = await fetchAndArchiveStories(userId);
                    userResult.archived = archiveResult.newlyArchived;

                    // Step 2: Fetch engagement
                    Logger.info(MODULE, `[${userId}] Step 2: Fetching engagement`);
                    const engagementResult = await fetchEngagementForArchivedStories(userId);
                    userResult.engagementUpdated = engagementResult.storiesUpdated;

                    // Step 3: Check prerequisites for composition
                    const audioCount = await countActiveAudioTracks();
                    if (audioCount === 0) {
                        Logger.warn(MODULE, `[${userId}] No audio tracks available, skipping composition`);
                        userResult.compositionSkipped = 'no_audio_tracks';
                        pipelineResults.push(userResult);
                        continue;
                    }

                    // Step 3: Compose video
                    Logger.info(MODULE, `[${userId}] Step 3: Composing video`);
                    const composeResult = await composeVideoFromTopStories(userId);
                    userResult.composedVideoId = composeResult.composedVideoId;
                    userResult.videoDuration = composeResult.durationSeconds;

                    // Step 4: Check if user has TikTok linked
                    const tiktokAccount = await getLinkedTikTokAccount(userId);
                    if (!tiktokAccount) {
                        Logger.warn(MODULE, `[${userId}] No TikTok account linked, skipping publish`);
                        userResult.publishSkipped = 'no_tiktok_account';
                        pipelineResults.push(userResult);
                        continue;
                    }

                    // Step 4: Publish to TikTok
                    Logger.info(MODULE, `[${userId}] Step 4: Publishing to TikTok`);
                    await updateTikTokPublishStatus(composeResult.composedVideoId, 'uploading');

                    const publishResult = await publishVideoToTikTok(
                        composeResult.outputPath,
                        userId,
                    );

                    if (publishResult.status === 'published') {
                        await updateTikTokPublishStatus(composeResult.composedVideoId, 'published', publishResult.publishId);
                        userResult.tiktokStatus = 'published';
                        userResult.tiktokPostId = publishResult.postId;
                    } else {
                        await updateTikTokPublishStatus(composeResult.composedVideoId, 'failed', publishResult.publishId, publishResult.error);
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

            return NextResponse.json({
                success: true,
                accountsProcessed: accounts.length,
                results: pipelineResults,
                timestamp: new Date().toISOString(),
            });
        } finally {
            await releaseLock();
        }
    } catch (error) {
        Logger.error(MODULE, 'TikTok pipeline cron failed', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 },
        );
    }
}
