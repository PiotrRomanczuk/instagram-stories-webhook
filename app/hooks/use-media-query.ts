'use client';

import { useSyncExternalStore } from 'react';

/**
 * Hook to detect viewport size changes using media queries.
 * Uses useSyncExternalStore for safe external store subscription
 * without triggering set-state-in-effect warnings.
 *
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean - true if media query matches
 */
export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		(callback) => {
			const mediaQuery = window.matchMedia(query);
			mediaQuery.addEventListener('change', callback);
			return () => mediaQuery.removeEventListener('change', callback);
		},
		() => window.matchMedia(query).matches,
		() => false,
	);
}
