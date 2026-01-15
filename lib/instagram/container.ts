import axios from 'axios';

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

export async function checkContainerStatus(containerId: string, accessToken: string): Promise<{ status: string; status_code?: string }> {
    try {
        const statusRes = await axios.get(`${GRAPH_API_BASE}/${containerId}`, {
            params: {
                fields: 'status_code,status',
                access_token: accessToken
            }
        });
        return statusRes.data;
    } catch (error: any) {
        console.error('Error checking container status:', error.response?.data || error.message);
        throw error;
    }
}

export async function waitForContainerReady(containerId: string, accessToken: string, maxAttempts = 20, delayMs = 2000): Promise<void> {
    console.log(`⏳ Waiting for media container ${containerId} to be ready...`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const status = await checkContainerStatus(containerId, accessToken);

            if (status.status_code === 'FINISHED' || status.status === 'FINISHED') {
                return;
            }

            if (status.status_code === 'ERROR' || status.status === 'ERROR') {
                throw new Error('Media container processing failed');
            }

            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        } catch (error: any) {
            console.warn(`Could not check status (attempt ${attempt}): ${error.message}`);
            if (attempt >= 3) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    throw new Error(`Media container not ready after ${maxAttempts} attempts`);
}
