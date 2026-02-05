'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Hook to manage state in URL search parameters
 * Provides utilities to get, set, and clear URL params
 */
export function useUrlState() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    /**
     * Get a URL parameter value
     */
    const getParam = useCallback(
        (key: string): string | null => {
            return searchParams?.get(key) || null;
        },
        [searchParams]
    );

    /**
     * Set a URL parameter
     */
    const setParam = useCallback(
        (key: string, value: string) => {
            const params = new URLSearchParams(searchParams?.toString());
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
            router.push(`${pathname}?${params.toString()}`);
        },
        [pathname, router, searchParams]
    );

    /**
     * Set multiple URL parameters at once
     */
    const setParams = useCallback(
        (updates: Record<string, string>) => {
            const params = new URLSearchParams(searchParams?.toString());
            Object.entries(updates).forEach(([key, value]) => {
                if (value) {
                    params.set(key, value);
                } else {
                    params.delete(key);
                }
            });
            router.push(`${pathname}?${params.toString()}`);
        },
        [pathname, router, searchParams]
    );

    /**
     * Clear a URL parameter
     */
    const clearParam = useCallback(
        (key: string) => {
            const params = new URLSearchParams(searchParams?.toString());
            params.delete(key);
            router.push(`${pathname}?${params.toString()}`);
        },
        [pathname, router, searchParams]
    );

    /**
     * Clear all URL parameters
     */
    const clearAllParams = useCallback(() => {
        router.push(pathname || '/');
    }, [pathname, router]);

    return {
        getParam,
        setParam,
        setParams,
        clearParam,
        clearAllParams,
    };
}
