import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTokens } from '@/lib/db';

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

export async function GET(request: NextRequest) {
    const tokens = await getTokens();
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;

    if (!tokens || !tokens.access_token) {
        return NextResponse.json({ error: 'Not authenticated. No tokens found in data/tokens.json' }, { status: 401 });
    }

    if (!appId || !appSecret) {
        return NextResponse.json({ error: 'App ID or App Secret missing in environment variables' }, { status: 500 });
    }

    try {
        const results: any = {
            stored_tokens: {
                ...tokens,
                access_token: `${tokens.access_token.substring(0, 10)}...` // Mask for safety but show it exists
            },
            full_token: tokens.access_token, // Provided for the debug view (user only)
        };

        // 1. Debug the token using Meta's debug_token endpoint
        // Requires an app access token: client_id|client_secret
        const appAccessToken = `${appId}|${appSecret}`;
        const debugTokenRes = await axios.get(`${GRAPH_API_BASE}/debug_token`, {
            params: {
                input_token: tokens.access_token,
                access_token: appAccessToken
            }
        });
        results.token_info = debugTokenRes.data.data;

        // 2. Get User Profile
        const meRes = await axios.get(`${GRAPH_API_BASE}/me`, {
            params: {
                fields: 'id,name,email',
                access_token: tokens.access_token
            }
        });
        results.user_profile = meRes.data;

        // 3. Get Permissions
        const permissionsRes = await axios.get(`${GRAPH_API_BASE}/me/permissions`, {
            params: { access_token: tokens.access_token }
        });
        results.permissions = permissionsRes.data.data;

        // 4. Get Facebook Pages - Use granular scopes to find page IDs
        let pageIds: string[] = [];

        // Extract page IDs from granular scopes in token debug info
        if (results.token_info.granular_scopes) {
            const pageScopes = results.token_info.granular_scopes.filter((s: any) =>
                s.scope && s.scope.includes('pages')
            );
            pageIds = Array.from(new Set(pageScopes.flatMap((s: any) => (s.target_ids || []) as string[]))) as string[];
        }

        // Try /me/accounts first (standard way)
        try {
            const pagesRes = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
                params: {
                    fields: 'id,name,access_token,category,instagram_business_account{id,username,name,profile_picture_url}',
                    access_token: tokens.access_token
                }
            });
            results.pages = pagesRes.data.data;
        } catch (error: any) {
            console.error('me/accounts failed:', error.response?.data);
            results.pages = [];
        }

        // If /me/accounts returned empty but we have page IDs from granular scopes, fetch them directly
        if (results.pages.length === 0 && pageIds.length > 0) {
            console.log('Fetching pages directly from granular scopes:', pageIds);
            const directPages = [];

            for (const pageId of pageIds) {
                try {
                    const pageRes = await axios.get(`${GRAPH_API_BASE}/${pageId}`, {
                        params: {
                            fields: 'id,name,category,instagram_business_account{id,username,name,profile_picture_url}',
                            access_token: tokens.access_token
                        }
                    });

                    // Try to get page access token (may not be available with granular permissions)
                    try {
                        const pageTokenRes = await axios.get(`${GRAPH_API_BASE}/${pageId}`, {
                            params: {
                                fields: 'access_token',
                                access_token: tokens.access_token
                            }
                        });
                        pageRes.data.access_token = pageTokenRes.data.access_token;
                    } catch (tokenErr) {
                        // Page token not available - that's okay
                        pageRes.data.access_token = null;
                    }

                    directPages.push(pageRes.data);
                } catch (err: any) {
                    console.error(`Failed to fetch page ${pageId}:`, err.response?.data);
                }
            }

            results.pages = directPages;
            results.pages_source = 'granular_scopes';
        } else if (results.pages.length > 0) {
            results.pages_source = 'me/accounts';
        }


        return NextResponse.json(results);
    } catch (error: any) {
        console.error('Debug API Error:', error.response?.data || error.message);
        return NextResponse.json({
            error: 'Failed to fetch debug information',
            details: error.response?.data || error.message
        }, { status: 500 });
    }
}
