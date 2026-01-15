import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTokens } from '@/lib/db';

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

export async function GET(request: NextRequest) {
    const tokens = await getTokens();

    if (!tokens || !tokens.access_token) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        // Get the page ID from granular scopes
        const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
        const appSecret = process.env.FB_APP_SECRET;

        if (!appId || !appSecret) {
            return NextResponse.json({ error: 'Missing app credentials' }, { status: 500 });
        }

        const appAccessToken = `${appId}|${appSecret}`;
        const debugTokenRes = await axios.get(`${GRAPH_API_BASE}/debug_token`, {
            params: {
                input_token: tokens.access_token,
                access_token: appAccessToken
            }
        });

        const granularScopes = debugTokenRes.data.data.granular_scopes || [];
        const pageScopes = granularScopes.filter((s: any) => s.scope.includes('pages'));
        const pageIds = [...new Set(pageScopes.flatMap((s: any) => s.target_ids))];

        const results: any = {
            detected_page_ids: pageIds,
            pages: []
        };

        // Try to fetch each page directly
        for (const pageId of pageIds) {
            try {
                const pageRes = await axios.get(`${GRAPH_API_BASE}/${pageId}`, {
                    params: {
                        fields: 'id,name,category,access_token,tasks,instagram_business_account{id,username,name,profile_picture_url}',
                        access_token: tokens.access_token
                    }
                });
                results.pages.push({
                    success: true,
                    data: pageRes.data
                });
            } catch (err: any) {
                results.pages.push({
                    success: false,
                    page_id: pageId,
                    error: err.response?.data || err.message
                });
            }
        }

        // Also try /me/accounts with different parameters
        try {
            const accountsRes = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
                params: {
                    fields: 'id,name,category,access_token,tasks',
                    limit: 100,
                    access_token: tokens.access_token
                }
            });
            results.me_accounts = accountsRes.data;
        } catch (err: any) {
            results.me_accounts_error = err.response?.data || err.message;
        }

        return NextResponse.json(results, { status: 200 });
    } catch (error: any) {
        console.error('Fetch Pages API Error:', error.response?.data || error.message);
        return NextResponse.json({
            error: 'Failed to fetch pages',
            details: error.response?.data || error.message
        }, { status: 500 });
    }
}
