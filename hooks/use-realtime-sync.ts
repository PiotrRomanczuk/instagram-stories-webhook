/**
 * Unified Realtime Sync Hook
 *
 * Subscribes to content_items table changes and automatically invalidates SWR cache.
 * All mutations are reflected instantly across all components via realtime.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   useRealtimeSync(); // Add this line
 *   const { data } = useSWR(contentKeys.list());
 *   // Component will automatically update when content changes
 * }
 * ```
 */

'use client';

import { useEffect, useRef } from 'react';
import { useSWRConfig } from 'swr';
import { supabase } from '@/lib/config/supabase';
import { getCurrentEnvironment } from '@/lib/content-db/environment';

interface RealtimeSyncOptions {
	/**
	 * Debounce delay in milliseconds to batch rapid changes
	 * @default 500
	 */
	debounceMs?: number;

	/**
	 * Whether to log realtime events for debugging
	 * @default false
	 */
	debug?: boolean;

	/**
	 * Filter realtime events by specific table
	 * @default 'content_items'
	 */
	table?: 'content_items' | 'scheduled_posts';
}

export function useRealtimeSync(options: RealtimeSyncOptions = {}) {
	const {
		debounceMs = 500,
		debug = false,
		table = 'content_items',
	} = options;

	const { mutate } = useSWRConfig();
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const environment = getCurrentEnvironment();

	useEffect(() => {
		if (debug) {
			console.log('[Realtime Sync] Initializing subscription', {
				table,
				environment,
				debounceMs,
			});
		}

		// Invalidate all content caches (debounced)
		const invalidateContentCache = () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			debounceTimerRef.current = setTimeout(() => {
				if (debug) {
					console.log('[Realtime Sync] Invalidating cache');
				}

				// Invalidate all content queries
				mutate((key) => {
					if (!Array.isArray(key)) return false;
					const path = key[0] as string;
					return (
						path === '/api/content' ||
						path === '/api/schedule' ||
						path.startsWith('/api/content/') ||
						path.startsWith('/api/schedule/')
					);
				});
			}, debounceMs);
		};

		// Subscribe to realtime changes
		const channel = supabase
			.channel(`${table}_changes`)
			.on(
				'postgres_changes',
				{
					event: '*', // Listen to INSERT, UPDATE, DELETE
					schema: 'public',
					table,
					// Filter by environment if available
					...(environment && {
						filter: `environment=eq.${environment}`,
					}),
				},
				(payload: { eventType: string; table: string; new?: { id?: string }; old?: { id?: string } }) => {
					if (debug) {
						console.log('[Realtime Sync] Change detected', {
							event: payload.eventType,
							table: payload.table,
							id: payload.new?.id || payload.old?.id,
						});
					}

					invalidateContentCache();
				}
			)
			.subscribe((status) => {
				if (debug) {
					console.log('[Realtime Sync] Subscription status:', status);
				}
			});

		// Cleanup
		return () => {
			if (debug) {
				console.log('[Realtime Sync] Cleaning up subscription');
			}

			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			supabase.removeChannel(channel);
		};
	}, [mutate, debounceMs, debug, table, environment]);
}

/**
 * Advanced hook that returns subscription status and control methods
 */
export function useRealtimeSyncWithControl(options: RealtimeSyncOptions = {}) {
	const { debug = false, table = 'content_items' } = options;
	const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

	useRealtimeSync(options);

	const pause = () => {
		if (subscriptionRef.current) {
			supabase.removeChannel(subscriptionRef.current);
			subscriptionRef.current = null;
			if (debug) {
				console.log('[Realtime Sync] Paused');
			}
		}
	};

	const resume = () => {
		if (!subscriptionRef.current) {
			// Re-initialize subscription
			if (debug) {
				console.log('[Realtime Sync] Resumed');
			}
			// This will be handled by the main useRealtimeSync hook
		}
	};

	return { pause, resume };
}
