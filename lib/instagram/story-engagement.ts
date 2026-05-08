import { Logger } from '@/lib/utils/logger';
import { getMediaInsights } from '@/lib/instagram/insights';
import {
    getStoriesNeedingInsights,
    updateStoryEngagement,
} from '@/lib/database/story-archive';
import { EngagementMetrics } from '@/lib/types/story-archive';

const MODULE = 'instagram:story-engagement';

export interface EngagementResult {
    userId: string;
    storiesProcessed: number;
    storiesUpdated: number;
    storiesFailed: number;
    errors: string[];
}

/**
 * Composite "most viewable / insightful" score for a story.
 *
 * Views (stored under `impressions` for legacy-schema compatibility) are the
 * base unit. Engagement signals can lift a story but rarely overpower a clear
 * viewability winner. `reach`, `navigation`, and `total_interactions` are
 * intentionally excluded to avoid double-counting `views` and `replies + shares`.
 *
 * Weights:
 * - views (impressions): 1.0     (raw viewability)
 * - replies:            10.0     (rare, deep DM-style engagement)
 * - shares:              8.0     (virality signal)
 * - profileVisits:       5.0     (curiosity → bio click)
 * - follows:            50.0     (strongest signal — committed because of this story)
 */
export function computeEngagementScore(metrics: EngagementMetrics): number {
    const views = metrics.impressions ?? 0;
    const replies = metrics.replies ?? 0;
    const shares = metrics.shares ?? 0;
    const profileVisits = metrics.profileVisits ?? 0;
    const follows = metrics.follows ?? 0;

    return (
        views * 1.0 +
        replies * 10.0 +
        shares * 8.0 +
        profileVisits * 5.0 +
        follows * 50.0
    );
}

/**
 * Fetches engagement insights for all recently archived stories that
 * haven't had insights fetched yet.
 *
 * Instagram story insights are only available during the story's 24h lifetime.
 * This must be called while stories are still active.
 */
export async function fetchEngagementForArchivedStories(
    userId: string,
): Promise<EngagementResult> {
    const result: EngagementResult = {
        userId,
        storiesProcessed: 0,
        storiesUpdated: 0,
        storiesFailed: 0,
        errors: [],
    };

    try {
        const stories = await getStoriesNeedingInsights(userId);

        if (stories.length === 0) {
            Logger.debug(MODULE, `No stories needing insights for user ${userId}`);
            return result;
        }

        Logger.info(MODULE, `Fetching insights for ${stories.length} stories (user ${userId})`);

        for (const story of stories) {
            result.storiesProcessed++;

            try {
                const insights = await getMediaInsights(story.igMediaId, userId, 'STORY');

                // Parse insights response into metrics. `views` is the v22+
                // replacement for `impressions` — store under the same field
                // so the score formula and UI keep working unchanged.
                const metrics: EngagementMetrics = {};
                for (const insight of insights) {
                    const raw = insight.values?.[0]?.value ?? 0;
                    const value = typeof raw === 'number' ? raw : 0;
                    switch (insight.name) {
                        case 'views':
                        case 'impressions':
                            metrics.impressions = (metrics.impressions ?? 0) + value;
                            break;
                        case 'reach':
                            metrics.reach = value;
                            break;
                        case 'replies':
                            metrics.replies = value;
                            break;
                        case 'total_interactions':
                            metrics.totalInteractions = value;
                            break;
                        case 'shares':
                            metrics.shares = value;
                            break;
                        case 'profile_visits':
                            metrics.profileVisits = value;
                            break;
                        case 'follows':
                            metrics.follows = value;
                            break;
                        // Legacy fields kept for older rows (Graph API <v22)
                        case 'taps_forward':
                            metrics.tapsForward = value;
                            break;
                        case 'taps_back':
                            metrics.tapsBack = value;
                            break;
                        case 'exits':
                            metrics.exits = value;
                            break;
                    }
                }

                const score = computeEngagementScore(metrics);

                await updateStoryEngagement(story.id, metrics, score);

                result.storiesUpdated++;
                Logger.debug(MODULE, `Updated engagement for story ${story.igMediaId}: score=${score.toFixed(1)}`);
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                result.storiesFailed++;
                result.errors.push(`Story ${story.igMediaId}: ${msg}`);

                // Instagram returns errors for expired stories — this is expected
                if (msg.includes('not found') || msg.includes('does not exist')) {
                    Logger.debug(MODULE, `Story ${story.igMediaId} insights unavailable (likely expired)`);
                } else {
                    Logger.warn(MODULE, `Failed to fetch insights for ${story.igMediaId}: ${msg}`);
                }
            }
        }

        Logger.info(MODULE, `Engagement fetch complete for user ${userId}: ${result.storiesUpdated} updated, ${result.storiesFailed} failed`);
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        Logger.error(MODULE, `fetchEngagementForArchivedStories failed for user ${userId}: ${msg}`, err);
        result.errors.push(msg);
    }

    return result;
}
