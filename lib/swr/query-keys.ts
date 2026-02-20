/**
 * Query Key Factory for SWR
 *
 * Provides hierarchical query keys for predictable cache invalidation.
 * Use array-based keys instead of URL strings for better cache control.
 *
 * @example
 * // List all content
 * useSWR(contentKeys.lists())
 *
 * // List with filters
 * useSWR(contentKeys.list({ tab: 'queue', limit: 50 }))
 *
 * // Single item
 * useSWR(contentKeys.detail('abc-123'))
 *
 * // Invalidate all content queries
 * mutate((key) => Array.isArray(key) && key[0] === '/api/content')
 */

// Type for query filters
type QueryFilters = Record<string, string | number | boolean | undefined>;

export const contentKeys = {
	all: () => ['/api/content'] as const,
	lists: () => [...contentKeys.all(), 'list'] as const,
	list: (filters?: QueryFilters) =>
		filters ? ([...contentKeys.lists(), filters] as const) : contentKeys.lists(),
	details: () => [...contentKeys.all(), 'detail'] as const,
	detail: (id: string) => [...contentKeys.details(), id] as const,
};

export const scheduleKeys = {
	all: () => ['/api/schedule'] as const,
	lists: () => [...scheduleKeys.all(), 'list'] as const,
	list: (filters?: QueryFilters) =>
		filters ? ([...scheduleKeys.lists(), filters] as const) : scheduleKeys.lists(),
	details: () => [...scheduleKeys.all(), 'detail'] as const,
	detail: (id: string) => [...scheduleKeys.details(), id] as const,
};

export const userKeys = {
	all: () => ['/api/users'] as const,
	lists: () => [...userKeys.all(), 'list'] as const,
	list: (filters?: QueryFilters) =>
		filters ? ([...userKeys.lists(), filters] as const) : userKeys.lists(),
	details: () => [...userKeys.all(), 'detail'] as const,
	detail: (id: string) => [...userKeys.details(), id] as const,
	me: () => [...userKeys.all(), 'me'] as const,
};

export const analyticsKeys = {
	all: () => ['/api/analytics'] as const,
	metrics: (filters?: QueryFilters) =>
		filters ? ([...analyticsKeys.all(), 'metrics', filters] as const) : ([...analyticsKeys.all(), 'metrics'] as const),
	insights: (accountId?: string) =>
		accountId ? ([...analyticsKeys.all(), 'insights', accountId] as const) : ([...analyticsKeys.all(), 'insights'] as const),
};

export const settingsKeys = {
	all: () => ['/api/settings'] as const,
	autoProcess: () => [...settingsKeys.all(), 'auto-process'] as const,
	publishing: () => [...settingsKeys.all(), 'publishing'] as const,
};

/**
 * Helper function to match query keys by prefix
 *
 * @example
 * // Invalidate all content queries
 * mutate(matchesQueryKey(contentKeys.all()))
 */
export function matchesQueryKey(prefix: readonly unknown[]) {
	return (key: unknown): boolean => {
		if (!Array.isArray(key)) return false;
		return prefix.every((part, i) => key[i] === part);
	};
}
