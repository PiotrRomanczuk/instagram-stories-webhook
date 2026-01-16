import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from "next-auth/next";
import { getLinkedFacebookAccount } from '@/lib/linked-accounts-db';
import { authOptions } from "@/lib/auth";

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

export async function GET(_request: NextRequest) {
    console.log("🔍 Fetching Facebook Pages...");
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const linkedAccount = await getLinkedFacebookAccount(session.user.id);

    if (!linkedAccount || !linkedAccount.access_token) {
        console.warn("⚠️ No linked Facebook account found for user:", session.user.id);
        return NextResponse.json({ error: 'Facebook not linked' }, { status: 400 });
    }

    try {
        const appId = process.env.AUTH_FACEBOOK_ID || process.env.NEXT_PUBLIC_FB_APP_ID;
        const appSecret = process.env.AUTH_FACEBOOK_SECRET || process.env.FB_APP_SECRET;

        // 1. Debug Token to find Granular Scopes
        let pageIds: string[] = [];
        if (appId && appSecret) {
            const appAccessToken = `${appId}|${appSecret}`;
            const debugTokenRes = await axios.get(`${GRAPH_API_BASE}/debug_token`, {
                params: {
                    input_token: linkedAccount.access_token,
                    access_token: appAccessToken
                }
            });

            interface GranularScope {
                scope: string;
                target_ids?: string[];
            }
            const granularScopes = (debugTokenRes.data.data.granular_scopes || []) as GranularScope[];
            const pageScopes = granularScopes.filter((s) => s.scope.includes('pages'));
            pageIds = [...new Set(pageScopes.flatMap((s) => s.target_ids || []))];
            console.log(`🔎 Found ${pageIds.length} Page IDs from granular scopes:`, pageIds);
        }

        interface FetchPagesResults {
            detected_page_ids: string[];
            pages: Array<{
                success: boolean;
                data?: any;
                page_id?: string;
                error?: any;
            }>;
            me_accounts?: any;
            me_accounts_error?: any;
        }
        const results: FetchPagesResults = {
            detected_page_ids: pageIds,
            pages: []
        };

        // 2. Try to fetch each page directly (Granular)
        for (const pageId of pageIds) {
            try {
                console.log(`Trying to fetch Page ${pageId}...`);
                const pageRes = await axios.get(`${GRAPH_API_BASE}/${pageId}`, {
                    params: {
                        fields: 'id,name,category,access_token,instagram_business_account{id,username,name,profile_picture_url}',
                        access_token: linkedAccount.access_token
                    }
                });
                console.log(`✅ Fetched Page ${pageId} successfully.`);
                results.pages.push({
                    success: true,
                    data: {
                        ...pageRes.data,
                        access_token: pageRes.data.access_token ? `${pageRes.data.access_token.substring(0, 10)}...` : null
                    }
                });
            } catch (err: any) {
                const errMsg = err.response?.data || err.message;
                console.error(`❌ Failed to fetch Page ${pageId}:`, JSON.stringify(errMsg));
                results.pages.push({
                    success: false,
                    page_id: pageId,
                    error: errMsg
                });
            }
        }

        // 3. Fallback: Try /me/accounts
        console.log("Trying /me/accounts fallback...");
        try {
            const accountsRes = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
                params: {
                    fields: 'id,name,category,access_token',
                    limit: 100,
                    access_token: linkedAccount.access_token
                }
            });
            console.log(`✅ /me/accounts returned ${accountsRes.data.data?.length || 0} pages.`);
            results.me_accounts = {
                ...accountsRes.data,
                data: (accountsRes.data.data || []).map((p: any) => ({
                    ...p,
                    access_token: p.access_token ? `${p.access_token.substring(0, 10)}...` : null
                }))
            };
        } catch (err: any) {
            const errMsg = err.response?.data || err.message;
            console.error("❌ /me/accounts failed:", JSON.stringify(errMsg));
            results.me_accounts_error = errMsg;
        }

        return NextResponse.json(results);
    } catch (error: any) {
        const errorData = axios.isAxiosError(error) ? (error.response?.data || error.message) : String(error);
        console.error('🔥 Critical Fetch Pages API Error:', errorData);
        return NextResponse.json({
            error: 'Failed to fetch pages',
            details: errorData
        }, { status: 500 });
    }
}
