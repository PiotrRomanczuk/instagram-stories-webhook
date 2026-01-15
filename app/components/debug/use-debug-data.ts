import { useState, useEffect, useCallback } from 'react';

export interface DebugData {
    stored_tokens: any;
    full_token: string;
    token_info: any;
    user_profile: any;
    permissions: any[];
    pages: any[];
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
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refresh: fetchData };
}
