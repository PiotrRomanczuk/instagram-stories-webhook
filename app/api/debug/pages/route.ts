import { NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from "next-auth/next";
import { getLinkedFacebookAccount } from '@/lib/database/linked-accounts';
import { authOptions } from "@/lib/auth";
import { isAdmin } from '@/lib/auth-helpers';

const GRAPH_API_BASE = 'https://graph.facebook.com/v24.0';

export async function GET() {
    // Block in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const linkedAccount = await getLinkedFacebookAccount(session.user.id);

    if (!linkedAccount || !linkedAccount.access_token) {
        return NextResponse.json({ error: 'Facebook not linked' }, { status: 400 });
    }

    try {
        interface PageDebugResult {
            access_token_present: boolean;
            user?: unknown;
            permissions?: unknown[];
            pages_minimal?: unknown;
            pages_minimal_error?: unknown;
            pages_full?: unknown;
            pages_full_error?: unknown;
            businesses?: unknown;
            businesses_error?: unknown;
            token_debug?: unknown;
        }
        const results: PageDebugResult = {
            access_token_present: !!linkedAccount.access_token,
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
                data: (pagesMinimalRes.data.data || []).map((p: { access_token?: string }) => ({
                    ...p,
                    access_token: undefined,
                    access_token_present: !!p.access_token,
                }))
            };
        } catch (err: unknown) {
            results.pages_minimal_error = axios.isAxiosError(err) ? (err.response?.data || err.message) : (err instanceof Error ? err.message : String(err));
        }

        // 4. Try to get pages with all fields
        try {
            const pagesFullRes = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
                params: {
                    fields: 'id,name,access_token,category,instagram_business_account{id,username,name}',
                    access_token: linkedAccount.access_token
                }
            });
            const maskedPages = (pagesFullRes.data.data || []).map((p: { access_token?: string }) => ({
                ...p,
                access_token: undefined,
                access_token_present: !!p.access_token,
            }));
            results.pages_full = { ...pagesFullRes.data, data: maskedPages };
        } catch (err: unknown) {
            results.pages_full_error = axios.isAxiosError(err) ? (err.response?.data || err.message) : (err instanceof Error ? err.message : String(err));
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
            const { app_id, type, application, expires_at, is_valid, scopes, user_id } = debugTokenRes.data.data;
            results.token_debug = { app_id, type, application, expires_at, is_valid, scopes, user_id };
        }

        return NextResponse.json(results);
    } catch (error: unknown) {
        const errorData = axios.isAxiosError(error) ? (error.response?.data || error.message) : (error instanceof Error ? error.message : String(error));
        console.error('Pages Debug API Error:', errorData);
        return NextResponse.json({
            error: 'Failed to fetch pages debug information',
            details: errorData
        }, { status: 500 });
    }
}
