import axios from 'axios';
import { withRetry } from '@/lib/utils/retry';
import { Logger } from '@/lib/utils/logger';

const GRAPH_API_BASE = 'https://graph.facebook.com/v24.0';
const MODULE = 'instagram';

/**
 * Determines if an Instagram API error should be retried.
 */
function isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const fbErrorCode = error.response?.data?.error?.code;
        if (statusCode && statusCode >= 500) return true;
        if (statusCode === 429 || [17, 32, 613].includes(fbErrorCode)) return true;
        if ([1, 2].includes(fbErrorCode)) return true;
    }
    return false;
}

export async function checkContainerStatus(containerId: string, accessToken: string): Promise<{ status: string; status_code?: string }> {
    return withRetry(
        async () => {
            const statusRes = await axios.get(`${GRAPH_API_BASE}/${containerId}`, {
                params: {
                    fields: 'status_code,status',
                    access_token: accessToken
                }
            });
            return statusRes.data;
        },
        { retryableErrors: isRetryableError }
    );
}

export async function waitForContainerReady(containerId: string, accessToken: string, maxAttempts = 30, delayMs = 2000): Promise<void> {
    await Logger.info(MODULE, `⏳ Waiting for media container ${containerId} to be ready...`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const status = await checkContainerStatus(containerId, accessToken);

            if (status.status_code === 'FINISHED' || status.status === 'FINISHED') {
                return;
            }

            if (status.status_code === 'ERROR' || status.status === 'ERROR') {
                throw new Error('Media container processing failed on Instagram servers');
            }

            // Still processing or in another state
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await Logger.warn(MODULE, `Status check attempt ${attempt} failed: ${errorMessage}`);
            
            // If it's a "Media container processing failed" error, don't keep polling
            if (errorMessage.includes('failed on Instagram servers')) {
                throw error;
            }

            if (attempt === maxAttempts) {
                throw new Error(`Media container not ready after ${maxAttempts} attempts: ${errorMessage}`);
            }
            
            // For other errors, wait and try again
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    throw new Error(`Media container not ready after ${maxAttempts} attempts`);
}
