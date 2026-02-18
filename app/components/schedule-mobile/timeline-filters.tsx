'use client';

import { cn } from '@/lib/utils';

export type FilterType = 'all' | 'scheduled' | 'published' | 'failed';

interface FilterChipProps {
    label: string;
    active: boolean;
    onClick: () => void;
    count?: number;
}

/**
 * Reusable filter chip component
 * - Pill-shaped with rounded corners
 * - Active state highlighted in blue
 * - Optional count badge
 * - Smooth hover and active animations
 */
export function FilterChip({ label, active, onClick, count }: FilterChipProps) {
    return (
        <button
            onClick={onClick}
            data-testid={`filter-chip-${label.toLowerCase()}`}
            className={cn(
                'px-4 py-2.5 min-h-[44px] rounded-full font-medium text-sm transition-all duration-200',
                'active:scale-95',
                'flex items-center gap-2 whitespace-nowrap',
                active
                    ? 'bg-[#2b6cee] text-white shadow-lg shadow-blue-500/20'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            )}
        >
            {label}
            {count !== undefined && count > 0 && (
                <span
                    className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-bold',
                        active ? 'bg-white/20' : 'bg-gray-600'
                    )}
                >
                    {count}
                </span>
            )}
        </button>
    );
}

interface TimelineFiltersProps {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    counts?: {
        all: number;
        scheduled: number;
        published: number;
        failed: number;
    };
}

/**
 * Timeline filter buttons component
 * - Displays filter chips: All | Scheduled | Published | Failed
 * - Responsive layout (wraps on mobile)
 * - Active filter highlighted with blue background
 */
export function TimelineFilters({ activeFilter, onFilterChange, counts }: TimelineFiltersProps) {
    const filters: { type: FilterType; label: string }[] = [
        { type: 'all', label: 'All' },
        { type: 'scheduled', label: 'Scheduled' },
        { type: 'published', label: 'Published' },
        { type: 'failed', label: 'Failed' },
    ];

    return (
        <div
            className="flex gap-2 overflow-x-auto scrollbar-hide"
            data-testid="timeline-filters"
        >
            {filters.map(({ type, label }) => (
                <FilterChip
                    key={type}
                    label={label}
                    active={activeFilter === type}
                    onClick={() => onFilterChange(type)}
                    count={counts?.[type]}
                />
            ))}
        </div>
    );
}
