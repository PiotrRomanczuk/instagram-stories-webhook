'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect viewport size changes using media queries
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean - true if media query matches
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        // Create media query list
        const mediaQuery = window.matchMedia(query);

        // Set initial value
        setMatches(mediaQuery.matches);

        // Event listener callback
        const handleChange = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        // Listen for changes
        mediaQuery.addEventListener('change', handleChange);

        // Cleanup
        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, [query]);

    return matches;
}
