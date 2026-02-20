/**
 * Migrated to use SWR and content_items table
 * @deprecated This hook is now a thin wrapper around useSWR for backward compatibility.
 * Consider using useSWR(contentKeys.list({ publishingStatus: 'scheduled' })) directly.
 */

import useSWR from 'swr';
import { contentKeys } from '@/lib/swr/query-keys';
import { ContentItem } from '@/lib/types';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';

interface UseSchedulePostsOptions {
	showAll?: boolean;
}

/**
 * Fetches scheduled content items using the unified content_items table
 *
 * This hook provides automatic cache invalidation via realtime sync.
 * No manual refresh needed - changes are reflected instantly.
 */
export function useSchedulePosts(options: UseSchedulePostsOptions = {}) {
	const { showAll = false } = options;

	// Subscribe to realtime updates (automatic cache invalidation)
	useRealtimeSync();

	// Build query parameters
	const params = new URLSearchParams();
	if (showAll) {
		params.append('includeArchived', 'true');
	} else {
		params.append('publishingStatus', 'scheduled');
	}
	params.append('sortBy', 'schedule-asc');
	params.append('limit', '1000');

	// Use SWR with array-based key for hierarchical cache invalidation
	const queryKey = contentKeys.list({
		publishingStatus: showAll ? undefined : 'scheduled',
		includeArchived: showAll,
		sortBy: 'schedule-asc',
		limit: 1000,
	});

	const { data, error, isLoading, mutate } = useSWR(
		queryKey,
		async () => {
			const url = `/api/content?${params.toString()}`;
			const res = await fetch(url);
			if (!res.ok) {
				throw new Error('Failed to fetch scheduled posts');
			}
			const json = await res.json();
			return json.items || [];
		},
		{
			revalidateOnFocus: false,
			dedupingInterval: 5000,
		}
	);

	// Map ContentItem[] to ScheduledPostWithUser[] for backward compatibility
	// @TODO: Eventually migrate all components to use ContentItem directly
	const posts = (data || []) as ContentItem[];

	// Backward compatibility: fetchPosts is now just a cache revalidation
	const fetchPosts = () => {
		mutate();
	};

	return {
		posts,
		loading: isLoading,
		error,
		fetchPosts, // Kept for backward compatibility
	};
}
