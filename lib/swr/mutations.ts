/**
 * Centralized SWR Mutations
 *
 * Provides mutation hooks with automatic cache invalidation and optimistic updates.
 * All mutations handle error rollback and proper cache synchronization.
 */

import { useSWRConfig } from 'swr';
import { settingsKeys } from './query-keys';
import { useCallback } from 'react';
import { CreateContentInput, UpdateContentInput, ContentItem } from '@/lib/types/posts';

// Bulk update type
interface BulkUpdateItem {
	id: string;
	updates: Partial<UpdateContentInput>;
}

// API response types
interface ContentListResponse {
	items: ContentItem[];
}

// Allow partial items during optimistic updates
type ContentDataType = ContentItem[] | ContentListResponse | (ContentItem | Partial<ContentItem>)[];

/**
 * Content Mutations
 */

export function useCreateContent() {
	const { mutate } = useSWRConfig();

	return useCallback(
		async (data: CreateContentInput) => {
			// Optimistic update - add temporary item to cache
			const tempId = `temp-${Date.now()}`;
			const optimisticItem: Partial<ContentItem> = {
				id: tempId,
				...data,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				version: 1,
			};

			// Update all content list caches optimistically
			mutate(
				(key) => Array.isArray(key) && key[0] === '/api/content',
				(current: unknown) => {
					if (!current) return current;
					if (Array.isArray(current)) {
						return [optimisticItem, ...current];
					}
					if (typeof current === 'object' && current !== null && 'items' in current) {
						const typed = current as ContentListResponse;
						return { ...typed, items: [optimisticItem, ...typed.items] };
					}
					return current;
				},
				{ revalidate: false }
			);

			try {
				const res = await fetch('/api/content', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data),
				});

				if (!res.ok) {
					const error = await res.json();
					throw new Error(error.error || 'Failed to create content');
				}

				const result = await res.json();

				// Revalidate all content queries with server data
				mutate((key) => Array.isArray(key) && key[0] === '/api/content');

				return result;
			} catch (error) {
				// Rollback optimistic update on error
				mutate(
					(key) => Array.isArray(key) && key[0] === '/api/content',
					(current: unknown) => {
						if (!current) return current;
						if (Array.isArray(current)) {
							return current.filter((item: ContentItem) => item.id !== tempId);
						}
						if (typeof current === 'object' && current !== null && 'items' in current) {
							const typed = current as ContentListResponse;
							return {
								...typed,
								items: typed.items.filter((item: ContentItem) => item.id !== tempId),
							};
						}
						return current;
					},
					{ revalidate: false }
				);
				throw error;
			}
		},
		[mutate]
	);
}

export function useUpdateContent() {
	const { mutate } = useSWRConfig();

	return useCallback(
		async (id: string, updates: Partial<UpdateContentInput>) => {
			// Store current data for rollback
			let previousData: unknown;

			// Optimistic update
			mutate(
				(key) => Array.isArray(key) && key[0] === '/api/content',
				(current: unknown) => {
					if (!current) return current;
					previousData = current;

					if (Array.isArray(current)) {
						return current.map((item: ContentItem) =>
							item.id === id ? { ...item, ...updates } : item
						);
					}
					if (typeof current === 'object' && current !== null && 'items' in current) {
						const typed = current as ContentListResponse;
						return {
							...typed,
							items: typed.items.map((item: ContentItem) =>
								item.id === id ? { ...item, ...updates } : item
							),
						};
					}
					return current;
				},
				{ revalidate: false }
			);

			try {
				const res = await fetch(`/api/content/${id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updates),
				});

				if (!res.ok) {
					const error = await res.json();
					throw new Error(error.error || 'Failed to update content');
				}

				const result = await res.json();

				// Revalidate all content queries
				mutate((key) => Array.isArray(key) && key[0] === '/api/content');

				return result;
			} catch (error) {
				// Rollback on error
				if (previousData) {
					mutate(
						(key) => Array.isArray(key) && key[0] === '/api/content',
						previousData,
						{ revalidate: false }
					);
				}
				throw error;
			}
		},
		[mutate]
	);
}

export function useDeleteContent() {
	const { mutate } = useSWRConfig();

	return useCallback(
		async (id: string) => {
			// Store current data for rollback
			let previousData: unknown;

			// Optimistic update - remove item from cache
			mutate(
				(key) => Array.isArray(key) && key[0] === '/api/content',
				(current: unknown) => {
					if (!current) return current;
					previousData = current;

					if (Array.isArray(current)) {
						return current.filter((item: ContentItem) => item.id !== id);
					}
					if (typeof current === 'object' && current !== null && 'items' in current) {
						const typed = current as ContentListResponse;
						return {
							...typed,
							items: typed.items.filter((item: ContentItem) => item.id !== id),
						};
					}
					return current;
				},
				{ revalidate: false }
			);

			try {
				const res = await fetch(`/api/content/${id}`, {
					method: 'DELETE',
				});

				if (!res.ok) {
					const error = await res.json();
					throw new Error(error.error || 'Failed to delete content');
				}

				// Revalidate all content queries
				mutate((key) => Array.isArray(key) && key[0] === '/api/content');

				return { success: true };
			} catch (error) {
				// Rollback on error
				if (previousData) {
					mutate(
						(key) => Array.isArray(key) && key[0] === '/api/content',
						previousData,
						{ revalidate: false }
					);
				}
				throw error;
			}
		},
		[mutate]
	);
}

export function useBulkUpdateContent() {
	const { mutate } = useSWRConfig();

	return useCallback(
		async (updates: BulkUpdateItem[]) => {
			// Store current data for rollback
			let previousData: unknown;

			// Optimistic update
			mutate(
				(key) => Array.isArray(key) && key[0] === '/api/content',
				(current: unknown) => {
					if (!current) return current;
					previousData = current;

					const updateMap = new Map(updates.map((u) => [u.id, u.updates]));

					if (Array.isArray(current)) {
						return current.map((item: ContentItem) => {
							if (!item.id) return item;
							const itemUpdates = updateMap.get(item.id);
							return itemUpdates ? { ...item, ...itemUpdates } : item;
						});
					}
					if (typeof current === 'object' && current !== null && 'items' in current) {
						const typed = current as ContentListResponse;
						return {
							...typed,
							items: typed.items.map((item: ContentItem) => {
								if (!item.id) return item;
								const itemUpdates = updateMap.get(item.id);
								return itemUpdates ? { ...item, ...itemUpdates } : item;
							}),
						};
					}
					return current;
				},
				{ revalidate: false }
			);

			try {
				const res = await fetch('/api/content/bulk', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ updates }),
				});

				if (!res.ok) {
					const error = await res.json();
					throw new Error(error.error || 'Failed to bulk update content');
				}

				const result = await res.json();

				// Revalidate all content queries
				mutate((key) => Array.isArray(key) && key[0] === '/api/content');

				return result;
			} catch (error) {
				// Rollback on error
				if (previousData) {
					mutate(
						(key) => Array.isArray(key) && key[0] === '/api/content',
						previousData,
						{ revalidate: false }
					);
				}
				throw error;
			}
		},
		[mutate]
	);
}

/**
 * Review Actions
 */

export function useApproveContent() {
	const { mutate } = useSWRConfig();

	return useCallback(
		async (id: string) => {
			const result = await fetch(`/api/content/${id}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'approve' }),
			});

			if (!result.ok) {
				const error = await result.json();
				throw new Error(error.error || 'Failed to approve content');
			}

			// Revalidate all content queries
			mutate((key) => Array.isArray(key) && key[0] === '/api/content');

			return result.json();
		},
		[mutate]
	);
}

export function useRejectContent() {
	const { mutate } = useSWRConfig();

	return useCallback(
		async (id: string, reason: string) => {
			const result = await fetch(`/api/content/${id}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'reject', reason }),
			});

			if (!result.ok) {
				const error = await result.json();
				throw new Error(error.error || 'Failed to reject content');
			}

			// Revalidate all content queries
			mutate((key) => Array.isArray(key) && key[0] === '/api/content');

			return result.json();
		},
		[mutate]
	);
}

/**
 * Settings Mutations
 */

export function useUpdateAutoProcess() {
	const { mutate } = useSWRConfig();

	return useCallback(
		async (enabled: boolean) => {
			// Optimistic update
			mutate(
				settingsKeys.autoProcess(),
				{ enabled },
				{ revalidate: false }
			);

			try {
				const res = await fetch('/api/settings/auto-process', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ enabled }),
				});

				if (!res.ok) {
					throw new Error('Failed to update auto-process setting');
				}

				const result = await res.json();
				mutate(settingsKeys.autoProcess());
				return result;
			} catch (error) {
				// Rollback on error
				mutate(settingsKeys.autoProcess());
				throw error;
			}
		},
		[mutate]
	);
}

export function useUpdatePublishing() {
	const { mutate } = useSWRConfig();

	return useCallback(
		async (enabled: boolean) => {
			// Optimistic update
			mutate(
				settingsKeys.publishing(),
				{ enabled },
				{ revalidate: false }
			);

			try {
				const res = await fetch('/api/settings/publishing', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ enabled }),
				});

				if (!res.ok) {
					throw new Error('Failed to update publishing setting');
				}

				const result = await res.json();
				mutate(settingsKeys.publishing());
				return result;
			} catch (error) {
				// Rollback on error
				mutate(settingsKeys.publishing());
				throw error;
			}
		},
		[mutate]
	);
}
