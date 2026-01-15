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
        const results: any = {
            token: tokens.access_token.substring(0, 20) + '...',
        };

        // 1. Get user info
        const meRes = await axios.get(`${GRAPH_API_BASE}/me`, {
            params: {
                fields: 'id,name,email',
                access_token: tokens.access_token
            }
        });
        results.user = meRes.data;

        // 2. Get permissions
        const permissionsRes = await axios.get(`${GRAPH_API_BASE}/me/permissions`, {
            params: { access_token: tokens.access_token }
        });
        results.permissions = permissionsRes.data.data;

        // 3. Try to get pages with minimal fields
        try {
            const pagesMinimalRes = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
                params: {
                    access_token: tokens.access_token
                }
            });
            results.pages_minimal = pagesMinimalRes.data;
        } catch (err: any) {
            results.pages_minimal_error = err.response?.data || err.message;
        }

        // 4. Try to get pages with all fields
        try {
            const pagesFullRes = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
                params: {
                    fields: 'id,name,access_token,category,tasks,instagram_business_account{id,username,name}',
                    access_token: tokens.access_token
                }
            });
            results.pages_full = pagesFullRes.data;
        } catch (err: any) {
            results.pages_full_error = err.response?.data || err.message;
        }

        // 5. Try alternative endpoint - get businesses
        try {
            const businessesRes = await axios.get(`${GRAPH_API_BASE}/me/businesses`, {
                params: {
                    access_token: tokens.access_token
                }
            });
            results.businesses = businessesRes.data;
        } catch (err: any) {
            results.businesses_error = err.response?.data || err.message;
        }

        // 6. Check token debug info
        const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
        const appSecret = process.env.FB_APP_SECRET;
        if (appId && appSecret) {
            const appAccessToken = `${appId}|${appSecret}`;
            const debugTokenRes = await axios.get(`${GRAPH_API_BASE}/debug_token`, {
                params: {
                    input_token: tokens.access_token,
                    access_token: appAccessToken
                }
            });
            results.token_debug = debugTokenRes.data.data;
        }

        return NextResponse.json(results, { status: 200 });
    } catch (error: any) {
        console.error('Pages Debug API Error:', error.response?.data || error.message);
        return NextResponse.json({
            error: 'Failed to fetch pages debug information',
            details: error.response?.data || error.message
        }, { status: 500 });
    }
}
