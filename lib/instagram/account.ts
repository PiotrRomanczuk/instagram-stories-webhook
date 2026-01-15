import axios from 'axios';

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

export async function getInstagramBusinessAccountId(accessToken: string): Promise<string | null> {
    try {
        const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
        const appSecret = process.env.FB_APP_SECRET;

        // Get token debug info to extract granular scopes
        let pageIds: string[] = [];
        if (appId && appSecret) {
            try {
                const appAccessToken = `${appId}|${appSecret}`;
                const debugTokenRes = await axios.get(`${GRAPH_API_BASE}/debug_token`, {
                    params: {
                        input_token: accessToken,
                        access_token: appAccessToken
                    }
                });

                // Extract page IDs from granular scopes
                if (debugTokenRes.data.data.granular_scopes) {
                    const pageScopes = debugTokenRes.data.data.granular_scopes.filter((s: any) =>
                        s.scope && s.scope.includes('pages')
                    );
                    pageIds = Array.from(new Set(pageScopes.flatMap((s: any) => (s.target_ids || []) as string[]))) as string[];
                    console.log('Found page IDs from granular scopes:', pageIds);
                }
            } catch (err) {
                console.warn('Could not fetch token debug info:', err);
            }
        }

        // 1. Try to get User's Pages via /me/accounts first
        let pages: any[] = [];
        try {
            const pagesRes = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
                params: {
                    fields: 'id,name,instagram_business_account{id,username}',
                    access_token: accessToken
                },
            });
            pages = pagesRes.data.data || [];
            console.log(`Found ${pages.length} Facebook Pages via /me/accounts`);
        } catch (error: any) {
            console.warn('/me/accounts failed:', error.response?.data || error.message);
        }

        // 2. If /me/accounts returned empty but we have page IDs from granular scopes, fetch them directly
        if (pages.length === 0 && pageIds.length > 0) {
            console.log('Fetching pages directly from granular scopes...');
            for (const pageId of pageIds) {
                try {
                    const pageRes = await axios.get(`${GRAPH_API_BASE}/${pageId}`, {
                        params: {
                            fields: 'id,name,instagram_business_account{id,username}',
                            access_token: accessToken
                        }
                    });
                    pages.push(pageRes.data);
                } catch (err: any) {
                    console.error(`Failed to fetch page ${pageId}:`, err.response?.data || err.message);
                }
            }
        }

        if (pages.length === 0) {
            console.error('❌ No Facebook Pages found.');
            return null;
        }

        // 3. Find first page with connected Instagram account
        for (const page of pages) {
            if (page.instagram_business_account) {
                return page.instagram_business_account.id;
            }

            try {
                const connectedRes = await axios.get(`${GRAPH_API_BASE}/${page.id}`, {
                    params: {
                        fields: 'instagram_business_account{id,username}',
                        access_token: accessToken
                    }
                });

                if (connectedRes.data.instagram_business_account) {
                    return connectedRes.data.instagram_business_account.id;
                }
            } catch (err: any) {
                console.error(`Error checking Instagram for page ${page.name}:`, err.response?.data || err.message);
            }
        }

        return null;
    } catch (error: any) {
        console.error('Error fetching IG Account ID:', error.response?.data || error.message);
        return null;
    }
}
