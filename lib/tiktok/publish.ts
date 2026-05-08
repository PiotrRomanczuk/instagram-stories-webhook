import { promises as fs } from 'fs';
import { Logger } from '@/lib/utils/logger';
import { getTikTokAccessToken } from '@/lib/tiktok/auth';
import {
    TikTokVideoInitResponse,
    TikTokPublishStatusResponse,
    TikTokPublishResult,
    TikTokPublishOptions,
} from '@/lib/types/tiktok';

const MODULE = 'tiktok:publish';
const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

// Polling config for publish status
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60; // 5 minutes max

/**
 * Publishes a locally stored video to TikTok using the chunk upload flow.
 *
 * Flow:
 * 1. Read video file from local disk
 * 2. Initialize upload (get upload_url)
 * 3. Upload video binary via PUT
 * 4. Poll publish status until complete
 */
export async function publishVideoToTikTok(
    localPath: string,
    userId: string,
    options: TikTokPublishOptions = {},
): Promise<TikTokPublishResult> {
    const accessToken = await getTikTokAccessToken(userId);
    if (!accessToken) {
        throw new Error('No valid TikTok access token. Please re-link your TikTok account.');
    }

    // Read video file
    const videoBuffer = await fs.readFile(localPath);
    const videoSize = videoBuffer.length;

    Logger.info(MODULE, `Publishing video to TikTok: ${Math.round(videoSize / 1024 / 1024)}MB`);

    // Step 1: Initialize upload
    const initResult = await initializeUpload(accessToken, videoSize, options);

    // Step 2: Upload video binary
    await uploadVideoChunk(initResult.uploadUrl, videoBuffer);

    // Step 3: Poll for publish status
    const result = await waitForPublishComplete(accessToken, initResult.publishId);

    Logger.info(MODULE, `TikTok publish ${result.status}: publishId=${result.publishId}`, {
        postId: result.postId,
    });

    return result;
}

/**
 * Initialize a TikTok video upload.
 */
async function initializeUpload(
    accessToken: string,
    videoSize: number,
    options: TikTokPublishOptions,
): Promise<{ publishId: string; uploadUrl: string }> {
    const chunkSize = videoSize; // Single chunk for simplicity (< 64MB typically)

    const body = {
        post_info: {
            title: options.title ?? '',
            privacy_level: options.privacyLevel ?? 'PUBLIC_TO_EVERYONE',
            disable_comment: options.disableComment ?? false,
            disable_duet: false,
            disable_stitch: false,
        },
        source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoSize,
            chunk_size: chunkSize,
            total_chunk_count: 1,
        },
    };

    const response = await fetch(`${TIKTOK_API_BASE}/post/publish/inbox/video/init/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(body),
    });

    const result = (await response.json()) as TikTokVideoInitResponse;

    if (result.error?.code !== 'ok' && result.error?.code) {
        throw new Error(`TikTok upload init failed: ${result.error.message} (${result.error.code})`);
    }

    if (!result.data?.publish_id || !result.data?.upload_url) {
        throw new Error('TikTok upload init response missing publish_id or upload_url');
    }

    Logger.info(MODULE, `Upload initialized: publishId=${result.data.publish_id}`);

    return {
        publishId: result.data.publish_id,
        uploadUrl: result.data.upload_url,
    };
}

/**
 * Upload video binary to TikTok's upload URL.
 */
async function uploadVideoChunk(uploadUrl: string, videoBuffer: Buffer): Promise<void> {
    const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': 'video/mp4',
            'Content-Range': `bytes 0-${videoBuffer.length - 1}/${videoBuffer.length}`,
            'Content-Length': String(videoBuffer.length),
        },
        body: new Uint8Array(videoBuffer),
    });

    if (!response.ok) {
        throw new Error(`TikTok video upload failed: ${response.status} ${response.statusText}`);
    }

    Logger.info(MODULE, `Video uploaded: ${Math.round(videoBuffer.length / 1024 / 1024)}MB`);
}

/**
 * Polls TikTok publish status until complete or failed.
 */
async function waitForPublishComplete(
    accessToken: string,
    publishId: string,
): Promise<TikTokPublishResult> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        await sleep(POLL_INTERVAL_MS);

        const response = await fetch(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ publish_id: publishId }),
        });

        const result = (await response.json()) as TikTokPublishStatusResponse;

        const status = result.data?.status;

        // PUBLISH_COMPLETE = direct-post finished. SEND_TO_USER_INBOX = upload
        // succeeded into the user's TT inbox; user finalizes inside the app.
        // Both are terminal success states.
        if (status === 'PUBLISH_COMPLETE' || status === 'SEND_TO_USER_INBOX') {
            return {
                publishId,
                status: 'published',
                postId: result.data.publicaly_available_post_id?.[0],
            };
        }

        if (status === 'FAILED') {
            return {
                publishId,
                status: 'failed',
                error: result.data.fail_reason || result.error?.message || 'Unknown failure',
            };
        }

        Logger.debug(MODULE, `Publish status: ${status} (attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS})`);
    }

    return {
        publishId,
        status: 'failed',
        error: `Publish timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`,
    };
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
