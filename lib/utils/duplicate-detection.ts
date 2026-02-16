import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase-admin';
import { getCurrentEnvironment } from '../content-db/environment';
import { Logger } from './logger';

const MODULE = 'duplicate-detection';

/**
 * Generate a SHA-256 hash of file content
 * Works with both external URLs and Supabase storage URLs
 */
export async function generateContentHash(url: string): Promise<string> {
    try {
        Logger.info(MODULE, `Generating content hash for: ${url}`);

        // Fetch file content
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();

        // Generate hash from actual file bytes
        const hash = crypto.createHash('sha256');
        hash.update(Buffer.from(buffer));
        const hashHex = hash.digest('hex');

        Logger.info(MODULE, `Generated hash: ${hashHex.substring(0, 16)}...`);
        return hashHex;
    } catch (error) {
        Logger.error(MODULE, 'Failed to generate content hash', error);
        throw error;
    }
}

/**
 * Check if this content was already published recently
 * Uses content hash for reliable duplicate detection regardless of URL
 */
export async function checkForRecentPublish(
    contentHash: string,
    userId: string,
    hoursBack: number = 24
): Promise<{ isDuplicate: boolean; existingPostId?: string; publishedAt?: number }> {
    try {
        const cutoffTime = Date.now() - hoursBack * 60 * 60 * 1000;

        const { data, error } = await supabaseAdmin
            .from('content_items')
            .select('id, published_at')
            .eq('environment', getCurrentEnvironment())
            .eq('content_hash', contentHash)
            .eq('user_id', userId)
            .eq('publishing_status', 'published')
            .gte('published_at', new Date(cutoffTime).toISOString())
            .order('published_at', { ascending: false })
            .limit(1);

        if (error) {
            Logger.error(MODULE, 'Error checking for duplicates', error);
            return { isDuplicate: false };
        }

        const isDuplicate = (data?.length ?? 0) > 0;

        if (isDuplicate) {
            Logger.warn(MODULE, `Duplicate content detected! Hash: ${contentHash.substring(0, 16)}... was published as post ${data[0].id}`);
        }

        return {
            isDuplicate,
            existingPostId: data?.[0]?.id,
            publishedAt: data?.[0]?.published_at ? Number(data[0].published_at) : undefined
        };
    } catch (error) {
        Logger.error(MODULE, 'Exception in checkForRecentPublish', error);
        return { isDuplicate: false };
    }
}

/**
 * For meme submissions: check if the meme was already scheduled/published
 */
export async function isMemeAlreadyScheduled(memeId: string): Promise<{
    isScheduled: boolean;
    postId?: string;
    status?: string;
}> {
    try {
        const { data, error } = await supabaseAdmin
            .from('content_items')
            .select('id, publishing_status')
            .eq('environment', getCurrentEnvironment())
            .eq('source_id', memeId)
            .in('publishing_status', ['scheduled', 'processing', 'published'])
            .limit(1);

        if (error) {
            Logger.error(MODULE, 'Error checking if meme is scheduled', error);
            return { isScheduled: false };
        }

        const isScheduled = (data?.length ?? 0) > 0;

        if (isScheduled) {
            Logger.warn(MODULE, `Meme ${memeId} is already scheduled/published as post ${data[0].id}`);
        }

        return {
            isScheduled,
            postId: data?.[0]?.id,
            status: data?.[0]?.publishing_status
        };
    } catch (error) {
        Logger.error(MODULE, 'Exception in isMemeAlreadyScheduled', error);
        return { isScheduled: false };
    }
}

/**
 * Generate a unique idempotency key for a scheduled post
 */
export function generateIdempotencyKey(userId: string, url: string, scheduledTime: number): string {
    const data = `${userId}:${url}:${scheduledTime}`;
    return crypto.createHash('sha256').update(data).digest('hex');
}
