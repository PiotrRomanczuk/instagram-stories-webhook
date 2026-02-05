'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/app/hooks/use-debounce';
import { TimelineFilters, type FilterType } from './timeline-filters';
import { cn } from '@/lib/utils';

interface TimelineHeaderProps {
    onSearchChange: (query: string) => void;
    onFilterChange: (filter: FilterType) => void;
    activeFilter: FilterType;
    counts?: {
        all: number;
        scheduled: number;
        published: number;
        failed: number;
    };
}

/**
 * Timeline header component with search and filters
 * - Search bar with debounced input (500ms delay)
 * - Filter chip buttons
 * - Responsive layout (stacks on mobile, row on desktop)
 * - Dark theme styling
 */
export function TimelineHeader({
    onSearchChange,
    onFilterChange,
    activeFilter,
    counts,
}: TimelineHeaderProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const debouncedSearch = useDebounce(searchQuery, 500);

    // Update parent component when debounced search changes
    useEffect(() => {
        onSearchChange(debouncedSearch);
    }, [debouncedSearch, onSearchChange]);

    const handleClearSearch = () => {
        setSearchQuery('');
        onSearchChange('');
    };

    const hasActiveFilters = activeFilter !== 'all' || searchQuery !== '';

    const handleClearFilters = () => {
        setSearchQuery('');
        onSearchChange('');
        onFilterChange('all');
    };

    return (
        <div className="space-y-4" data-testid="timeline-header">
            {/* Search Bar */}
            <div className="relative">
                <Search
                    className={cn(
                        'absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors',
                        isFocused ? 'text-blue-400' : 'text-gray-500'
                    )}
                />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Search scheduled stories..."
                    data-testid="search-input"
                    className={cn(
                        'w-full pl-12 pr-12 py-3 rounded-xl',
                        'bg-gray-800 border border-gray-700',
                        'text-white placeholder-gray-500',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                        'transition-all duration-200'
                    )}
                />
                {searchQuery && (
                    <button
                        onClick={handleClearSearch}
                        data-testid="clear-search"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <TimelineFilters
                    activeFilter={activeFilter}
                    onFilterChange={onFilterChange}
                    counts={counts}
                />
                {hasActiveFilters && (
                    <button
                        onClick={handleClearFilters}
                        data-testid="clear-filters"
                        className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                    >
                        Clear all
                    </button>
                )}
            </div>
        </div>
    );
}
