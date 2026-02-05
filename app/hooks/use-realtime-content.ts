'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/config/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { ContentItemRow } from '@/lib/types/posts';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeContentEvent {
	eventType: RealtimeEventType;
	new?: ContentItemRow;
	old?: ContentItemRow;
	timestamp: number;
}

export interface UseRealtimeContentOptions {
	/**
	 * Callback invoked when any content change occurs
	 * Triggers SWR revalidation
	 */
	onUpdate: () => void;

	/**
	 * Callback invoked for specific event types with full event details
	 * Use for toast notifications and animations
	 */
	onEvent?: (event: RealtimeContentEvent) => void;

	/**
	 * Only listen to content items with scheduled_time
	 * Default: true (only scheduled posts)
	 */
	scheduledOnly?: boolean;

	/**
	 * Debounce multiple rapid updates (in ms)
	 * Default: 500ms
	 */
	debounceMs?: number;
}

/**
 * Hook for subscribing to real-time content changes via Supabase Realtime
 *
 * @example
 * ```tsx
 * const { mutate } = useSWR('/api/content');
 *
 * useRealtimeContent({
 *   onUpdate: () => mutate(),
 *   onEvent: (event) => {
 *     if (event.eventType === 'INSERT') {
 *       toast.success('New post scheduled');
 *     }
 *   }
 * });
 * ```
 */
export function useRealtimeContent(options: UseRealtimeContentOptions) {
	const {
		onUpdate,
		onEvent,
		scheduledOnly = true,
		debounceMs = 500,
	} = options;

	const channelRef = useRef<RealtimeChannel | null>(null);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
	const isConnectedRef = useRef(false);

	const debouncedUpdate = useCallback(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			onUpdate();
		}, debounceMs);
	}, [onUpdate, debounceMs]);

	const handleChange = useCallback((
		payload: RealtimePostgresChangesPayload<ContentItemRow>
	) => {
		console.log('[Realtime] Content changed:', {
			eventType: payload.eventType,
			table: payload.table,
			newData: payload.new,
		});

		// Create event object
		const event: RealtimeContentEvent = {
			eventType: payload.eventType as RealtimeEventType,
			new: payload.new as ContentItemRow | undefined,
			old: payload.old as ContentItemRow | undefined,
			timestamp: Date.now(),
		};

		// Notify listeners
		onEvent?.(event);
		debouncedUpdate();
	}, [onEvent, debouncedUpdate]);

	useEffect(() => {
		console.log('[Realtime] Setting up Supabase Realtime subscription...');

		// Build filter
		const filter = scheduledOnly
			? 'scheduled_time=not.is.null'
			: undefined;

		// Create channel
		const channel = supabase
			.channel('content-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'content',
					...(filter && { filter }),
				},
				handleChange
			)
			.subscribe((status, err) => {
				if (status === 'SUBSCRIBED') {
					console.log('[Realtime] Connected to content changes');
					isConnectedRef.current = true;
				} else if (status === 'CHANNEL_ERROR') {
					console.error('[Realtime] Channel error:', err);
					isConnectedRef.current = false;

					// Auto-reconnect after 5 seconds
					if (reconnectTimerRef.current) {
						clearTimeout(reconnectTimerRef.current);
					}
					reconnectTimerRef.current = setTimeout(() => {
						console.log('[Realtime] Attempting to reconnect...');
						channel.subscribe();
					}, 5000);
				} else if (status === 'TIMED_OUT') {
					console.error('[Realtime] Connection timed out');
					isConnectedRef.current = false;
				} else if (status === 'CLOSED') {
					console.log('[Realtime] Connection closed');
					isConnectedRef.current = false;
				}
			});

		channelRef.current = channel;

		// Cleanup
		return () => {
			console.log('[Realtime] Unsubscribing from content changes');
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
			if (reconnectTimerRef.current) {
				clearTimeout(reconnectTimerRef.current);
			}
			channel.unsubscribe();
			isConnectedRef.current = false;
		};
	}, [handleChange, scheduledOnly]);

	return {
		isConnected: isConnectedRef.current,
	};
}
