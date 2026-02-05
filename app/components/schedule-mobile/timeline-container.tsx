'use client';

import { useState, useEffect, Suspense } from 'react';
import { TimelineHeader } from './timeline-header';
import { type FilterType } from './timeline-filters';
import { useUrlState } from '@/app/hooks/use-url-state';

interface TimelineContainerProps {
    children: React.ReactNode;
    onSearchChange?: (query: string) => void;
    onFilterChange?: (filter: FilterType) => void;
}

/**
 * Container component that manages timeline state and URL sync
 * - Persists search query and active filter in URL params
 * - Provides header with search and filters
 * - Example: ?filter=scheduled&search=summer
 */
function TimelineContainerContent({
    children,
    onSearchChange,
    onFilterChange,
}: TimelineContainerProps) {
    const { getParam, setParams } = useUrlState();

    // Initialize state from URL params
    const [activeFilter, setActiveFilter] = useState<FilterType>(
        (getParam('filter') as FilterType) || 'all'
    );
    const [searchQuery, setSearchQuery] = useState(getParam('search') || '');

    // Update URL when filter or search changes
    useEffect(() => {
        setParams({
            filter: activeFilter === 'all' ? '' : activeFilter,
            search: searchQuery,
        });
    }, [activeFilter, searchQuery, setParams]);

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        onSearchChange?.(query);
    };

    const handleFilterChange = (filter: FilterType) => {
        setActiveFilter(filter);
        onFilterChange?.(filter);
    };

    // Mock counts - replace with actual data
    const counts = {
        all: 42,
        scheduled: 15,
        published: 20,
        failed: 3,
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                <TimelineHeader
                    onSearchChange={handleSearchChange}
                    onFilterChange={handleFilterChange}
                    activeFilter={activeFilter}
                    counts={counts}
                />
                {children}
            </div>
        </div>
    );
}

/**
 * Wrapper with Suspense boundary for useSearchParams
 */
export function TimelineContainer(props: TimelineContainerProps) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
            <TimelineContainerContent {...props} />
        </Suspense>
    );
}
