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
        try {
            const res = await fetch('/api/debug/auth');
            if (!res.ok) throw new Error('Failed to fetch debug data');
            const debugPayload = await res.json();
            setData(debugPayload);
        } catch (err: unknown) {
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
