import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTokens } from '@/lib/db';

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

export async function GET(_request: NextRequest) {
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

        interface GranularScope {
            scope: string;
            target_ids?: string[];
        }
        const granularScopes = (debugTokenRes.data.data.granular_scopes || []) as GranularScope[];
        const pageScopes = granularScopes.filter((s) => s.scope.includes('pages'));
        const pageIds = [...new Set(pageScopes.flatMap((s) => s.target_ids || []))];

        interface FetchPagesResults {
            detected_page_ids: string[];
            pages: Array<{
                success: boolean;
                data?: unknown;
                page_id?: string;
                error?: unknown;
            }>;
            me_accounts?: unknown;
            me_accounts_error?: unknown;
        }
        const results: FetchPagesResults = {
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
                    data: {
                        ...pageRes.data,
                        access_token: pageRes.data.access_token ? `${pageRes.data.access_token.substring(0, 10)}...` : null
                    }
                });
            } catch (err: unknown) {
                results.pages.push({
                    success: false,
                    page_id: pageId,
                    error: axios.isAxiosError(err) ? (err.response?.data || err.message) : String(err)
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
            results.me_accounts = {
                ...accountsRes.data,
                data: (accountsRes.data.data || []).map((p: { access_token?: string }) => ({
                    ...p,
                    access_token: p.access_token ? `${p.access_token.substring(0, 10)}...` : null
                }))
            };
        } catch (err: unknown) {
            results.me_accounts_error = axios.isAxiosError(err) ? (err.response?.data || err.message) : String(err);
        }

        return NextResponse.json(results, { status: 200 });
    } catch (error: unknown) {
        const errorData = axios.isAxiosError(error) ? (error.response?.data || error.message) : String(error);
        console.error('Fetch Pages API Error:', errorData);
        return NextResponse.json({
            error: 'Failed to fetch pages',
            details: errorData
        }, { status: 500 });
    }
}
