import { useMemo } from 'react';
import useSWR from 'swr';
import { MemeSubmission } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UseUserMemesOptions {
	search?: string;
	status?: string;
	sort?: string;
	dateFrom?: string | null;
	dateTo?: string | null;
	userFilter?: string;
	page?: number;
	limit?: number;
}

export function useUserMemes(options: UseUserMemesOptions = {}) {
	const {
		search = '',
		status = '',
		sort = 'newest',
		dateFrom = null,
		dateTo = null,
		userFilter = '',
		page = 1,
		limit = 12,
	} = options;

	// Validate page number (prevent negative or 0)
	const safePage = Math.max(1, Math.min(page, 9999)); // Cap at 9999 to prevent abuse

	const queryParams = useMemo(() => {
		const params = new URLSearchParams();
		if (search) params.append('search', search);
		if (status) params.append('status', status);
		if (sort && sort !== 'newest') params.append('sort', sort);
		if (dateFrom) params.append('dateFrom', dateFrom);
		if (dateTo) params.append('dateTo', dateTo);
		if (userFilter) params.append('userEmail', userFilter);
		params.append('page', safePage.toString());
		params.append('limit', limit.toString());
		return params.toString();
	}, [search, status, sort, dateFrom, dateTo, userFilter, safePage, limit]);

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
		refresh: mutate,
	};
}
