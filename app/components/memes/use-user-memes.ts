import { useMemo } from 'react';
import useSWR from 'swr';
import { MemeSubmission } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UseUserMemesOptions {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
}

export function useUserMemes(options: UseUserMemesOptions = {}) {
    const { search = '', status = '', page = 1, limit = 12 } = options;

    const queryParams = useMemo(() => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (status) params.append('status', status);
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        return params.toString();
    }, [search, status, page, limit]);

    const url = `/api/memes${queryParams ? `?${queryParams}` : ''}`;

    const { data, error, isLoading, mutate } = useSWR<{
        memes: MemeSubmission[];
        pagination: { page: number; limit: number; hasMore: boolean };
    }>(url, fetcher);

    return {
        memes: data?.memes || [],
        pagination: data?.pagination || { page: 1, limit, hasMore: false },
        isLoading,
        isError: error,
        refresh: mutate
    };
}
