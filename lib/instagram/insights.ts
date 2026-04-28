import axios from 'axios';
import { getFacebookAccessToken } from '@/lib/database/linked-accounts';
import { Logger } from '@/lib/utils/logger';
import { MediaInsight, PostType } from '@/lib/types';

const GRAPH_API_BASE = 'https://graph.facebook.com/v24.0';
const MODULE = 'insights';

/**
 * Story metrics ranked from richest to safest. Meta's `metric[N] must be one
 * of...` (or "the X metric is no longer supported") errors reject the entire
 * call when ANY listed metric is unsupported for the media type, so we drop
 * the offending metric and retry.
 *
 * Graph API v22+ deprecations for STORY media:
 *  - `impressions` → use `views` (semantically equivalent)
 *  - `taps_forward` / `taps_back` / `exits` → retired (subset of `navigation`)
 *
 * `total_interactions` appears in Meta's general allow-list but is rejected
 * for STORY media, so it sits low in the priority list.
 */
const STORY_METRICS_PRIORITY = [
    'views',
    'reach',
    'replies',
    'shares',
    'total_interactions',
    'navigation',
    'follows',
    'profile_visits',
    'profile_activity',
    'impressions', // Legacy fallback (pre-v22 accounts)
];

const FEED_METRICS = ['impressions', 'reach', 'saved', 'total_interactions'];
const REEL_METRICS = [
    'impressions',
    'reach',
    'saved',
    'total_interactions',
    'plays',
    'shares',
    'video_views',
];

interface MetricErrorParse {
    failedMetrics: string[];
    rawMessage: string;
}

// "metric[3] must be one of the following values..." — index points at the
// invalid metric in the request order.
const METRIC_INDEX_RE = /metric\[(\d+)\]/i;

// Phrases Meta uses to signal an unsupported metric. We pair these with a
// scan of the message for any of our attempted metric names.
const UNSUPPORTED_PHRASES = [
    'no longer supported',
    'not supported',
    'does not support',
    'not available',
    'is invalid',
    'deprecated',
    'unsupported',
];

function isUnsupportedSignal(message: string): boolean {
    const lower = message.toLowerCase();
    return UNSUPPORTED_PHRASES.some((p) => lower.includes(p));
}

function parseMetricError(message: string, attemptedMetrics: string[]): MetricErrorParse {
    // 1. metric[N] — single index-based rejection
    const idxMatch = message.match(METRIC_INDEX_RE);
    if (idxMatch) {
        const idx = Number(idxMatch[1]);
        if (Number.isFinite(idx) && idx >= 0 && idx < attemptedMetrics.length) {
            return { failedMetrics: [attemptedMetrics[idx]], rawMessage: message };
        }
    }

    // 2. Scan the message for any attempted metric names mentioned alongside
    //    an "unsupported" signal. Handles formats like:
    //     - "the impressions metric is no longer supported"
    //     - "does not support the likes, comments metric for this media product type"
    //     - "the X, Y, Z metrics are not available"
    if (isUnsupportedSignal(message)) {
        const lower = message.toLowerCase();
        const mentioned = attemptedMetrics.filter((m) => {
            const re = new RegExp(`\\b${m.replace(/[_]/g, '_')}\\b`);
            return re.test(lower);
        });
        if (mentioned.length > 0) {
            return { failedMetrics: mentioned, rawMessage: message };
        }
    }

    return { failedMetrics: [], rawMessage: message };
}

async function requestInsights(
    igMediaId: string,
    metrics: string[],
    accessToken: string,
): Promise<MediaInsight[]> {
    const url = `${GRAPH_API_BASE}/${igMediaId}/insights`;
    const response = await axios.get(url, {
        params: { metric: metrics.join(','), access_token: accessToken },
    });
    return response.data.data as MediaInsight[];
}

/**
 * Fetches insights for a specific Instagram Media object. Resilient against
 * Meta deprecating individual metrics: drops any metric Meta rejects (the
 * `metric[N]` error format identifies the offender) and retries until a
 * working subset is found, or returns whatever was already gathered.
 */
export async function getMediaInsights(
    igMediaId: string,
    userId: string,
    postType: PostType = 'STORY',
): Promise<MediaInsight[]> {
    const accessToken = await getFacebookAccessToken(userId);
    if (!accessToken) {
        throw new Error(`No access token found for user ${userId}`);
    }

    let candidates: string[];
    if (postType === 'STORY') candidates = [...STORY_METRICS_PRIORITY];
    else if (postType === 'REEL') candidates = [...REEL_METRICS];
    else candidates = [...FEED_METRICS];

    const droppedMetrics: string[] = [];
    let lastError: string | null = null;

    // Cap retries at the number of candidate metrics to prevent loops.
    for (let attempt = 0; attempt < candidates.length; attempt++) {
        if (candidates.length === 0) break;
        try {
            return await requestInsights(igMediaId, candidates, accessToken);
        } catch (error: unknown) {
            let errorMessage = 'Failed to fetch insights';
            if (axios.isAxiosError(error)) {
                errorMessage = error.response?.data?.error?.message || error.message;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
            lastError = errorMessage;

            const parsed = parseMetricError(errorMessage, candidates);
            if (parsed.failedMetrics.length === 0) {
                // Not a metric-validation error — propagate (auth, expired story, etc.)
                Logger.error(
                    MODULE,
                    `❌ Insights failed for ${igMediaId}: ${errorMessage}`,
                    error,
                );
                throw new Error(errorMessage);
            }

            droppedMetrics.push(...parsed.failedMetrics);
            const dropSet = new Set(parsed.failedMetrics);
            candidates = candidates.filter((m) => !dropSet.has(m));
            Logger.warn(
                MODULE,
                `Metrics [${parsed.failedMetrics.join(', ')}] rejected for ${postType} media ${igMediaId}, retrying with ${candidates.length} metric(s)`,
            );
        }
    }

    Logger.error(
        MODULE,
        `❌ All metric candidates exhausted for ${igMediaId} (dropped: ${droppedMetrics.join(', ')})`,
    );
    throw new Error(lastError ?? 'No supported metrics for this media');
}
