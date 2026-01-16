import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from "next-auth/next";
import { getLinkedFacebookAccount } from '@/lib/linked-accounts-db';
import { authOptions } from "@/lib/auth";

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

export async function GET(_request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const linkedAccount = await getLinkedFacebookAccount(session.user.id);

    if (!linkedAccount || !linkedAccount.access_token) {
        return NextResponse.json({ error: 'Facebook not linked' }, { status: 400 });
    }

    try {
        interface PageDebugResult {
            token: string;
            user?: any;
            permissions?: any[];
            pages_minimal?: any;
            pages_minimal_error?: any;
            pages_full?: any;
            pages_full_error?: any;
            businesses?: any;
            businesses_error?: any;
            token_debug?: any;
        }
        const results: PageDebugResult = {
            token: linkedAccount.access_token.substring(0, 20) + '...',
        };

        // 1. Get user info
        const meRes = await axios.get(`${GRAPH_API_BASE}/me`, {
            params: {
                fields: 'id,name,email',
                access_token: linkedAccount.access_token
            }
        });
        results.user = meRes.data;

        // 2. Get permissions
        const permissionsRes = await axios.get(`${GRAPH_API_BASE}/me/permissions`, {
            params: { access_token: linkedAccount.access_token }
        });
        results.permissions = permissionsRes.data.data;

        // 3. Try to get pages with minimal fields
        try {
            const pagesMinimalRes = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
                params: {
                    access_token: linkedAccount.access_token
                }
            });
            results.pages_minimal = {
                ...pagesMinimalRes.data,
                data: (pagesMinimalRes.data.data || []).map((p: any) => ({
                    ...p,
                    access_token: p.access_token ? `${p.access_token.substring(0, 10)}...` : null
                }))
            };
        } catch (err: any) {
            results.pages_minimal_error = err.response?.data || err.message;
        }

        // 4. Try to get pages with all fields
        try {
            const pagesFullRes = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
                params: {
                    fields: 'id,name,access_token,category,instagram_business_account{id,username,name}',
                    access_token: linkedAccount.access_token
                }
            });
            const maskedPages = (pagesFullRes.data.data || []).map((p: any) => ({
                ...p,
                access_token: p.access_token ? `${p.access_token.substring(0, 10)}...` : null
            }));
            results.pages_full = { ...pagesFullRes.data, data: maskedPages };
        } catch (err: any) {
            results.pages_full_error = err.response?.data || err.message;
        }

        // Check token debug info
        const appId = process.env.AUTH_FACEBOOK_ID || process.env.NEXT_PUBLIC_FB_APP_ID;
        const appSecret = process.env.AUTH_FACEBOOK_SECRET || process.env.FB_APP_SECRET;
        if (appId && appSecret) {
            const appAccessToken = `${appId}|${appSecret}`;
            const debugTokenRes = await axios.get(`${GRAPH_API_BASE}/debug_token`, {
                params: {
                    input_token: linkedAccount.access_token,
                    access_token: appAccessToken
                }
            });
            results.token_debug = debugTokenRes.data.data;
        }

        return NextResponse.json(results);
    } catch (error: any) {
        const errorData = axios.isAxiosError(error) ? (error.response?.data || error.message) : String(error);
        console.error('Pages Debug API Error:', errorData);
        return NextResponse.json({
            error: 'Failed to fetch pages debug information',
            details: errorData
        }, { status: 500 });
    }
}
