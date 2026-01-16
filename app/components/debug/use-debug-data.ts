import { useState, useEffect, useCallback } from 'react';

export interface DebugData {
    stored_tokens: {
        access_token: string;
        expires_at?: number;
        user_id?: string;
    };
    token_info?: {
        granular_scopes?: Array<{
            scope?: string;
            target_ids?: string[];
        }>;
        [key: string]: unknown;
    };
    user_profile?: {
        id: string;
        name: string;
        email?: string;
        picture?: {
            data?: {
                url?: string;
            };
        };
    };
    permissions?: Array<{
        permission: string;
        status: string;
    }>;
    pages: Array<{
        id: string;
        name: string;
        access_token?: string | null;
        category?: string;
        instagram_business_account?: {
            id: string;
            username: string;
            name?: string;
            profile_picture_url?: string;
        };
    }>;
    pages_source?: string;
}

export function useDebugData() {
    const [data, setData] = useState<DebugData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Auth & Token Status
            const authRes = await fetch('/api/debug/auth');
            if (!authRes.ok) throw new Error('Failed to fetch auth debug data');
            const authData = await authRes.json();

            if (!authData.authenticated) {
                throw new Error('Not authenticated');
            }

            // 2. Fetch Pages (if linked)
            let pagesData: any[] = [];
            let pagesSource = 'none';

            if (authData.facebook_linked) {
                try {
                    const pagesRes = await fetch('/api/debug/fetch-pages');
                    if (pagesRes.ok) {
                        const pagesPayload = await pagesRes.json();

                        // Strategy: Prefer 'pages' (direct fetch), fallback to 'me_accounts'
                        if (pagesPayload.pages && pagesPayload.pages.length > 0) {
                            pagesData = pagesPayload.pages
                                .filter((p: any) => p.success && p.data)
                                .map((p: any) => p.data);
                            pagesSource = 'granular_lookup';
                        } else if (pagesPayload.me_accounts && pagesPayload.me_accounts.data) {
                            pagesData = pagesPayload.me_accounts.data;
                            pagesSource = 'me_accounts';
                        }
                    }
                } catch (pageErr) {
                    console.error('Failed to fetch pages:', pageErr);
                    // Don't fail the whole dashboard if pages fail
                }
            }

            // 3. Transform into DebugData shape
            const formattedData: DebugData = {
                stored_tokens: {
                    access_token: authData.facebook?.access_token || 'N/A',
                    expires_at: authData.facebook?.expires_at,
                    user_id: authData.facebook?.provider_account_id
                },
                token_info: authData.token_debug,
                user_profile: {
                    id: authData.facebook_live?.id || authData.user?.id || 'unknown',
                    name: authData.facebook_live?.name || authData.user?.name || 'Unknown User',
                    email: authData.facebook_live?.email || authData.user?.email,
                    picture: authData.facebook_live?.picture
                },
                permissions: authData.permissions,
                pages: pagesData || [],
                pages_source: pagesSource
            };

            setData(formattedData);
        } catch (err: unknown) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refresh: fetchData };
}
