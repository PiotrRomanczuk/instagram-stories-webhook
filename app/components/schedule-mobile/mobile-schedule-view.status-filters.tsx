'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import { STATUS_FILTERS } from './mobile-schedule-view.helpers';

interface StatusFiltersProps {
	statusFilter: string;
	dayItems: ContentItem[];
	overdueCount: number;
	onFilterChange: (filter: string) => void;
}

/**
 * Horizontally scrollable status filter chips
 */
export function StatusFilters({
	statusFilter,
	dayItems,
	overdueCount,
	onFilterChange,
}: StatusFiltersProps) {
	return (
		<div data-tour="schedule-status-filters" className="flex items-center gap-2 px-4 py-2 bg-white border-t border-gray-100 overflow-x-auto scrollbar-hide">
			{STATUS_FILTERS.map(({ key, label }) => {
				const isActive = statusFilter === key;
				const count = key === 'all' ? dayItems.length : dayItems.filter(i => i.publishingStatus === key).length;
				return (
					<button
						key={key}
						onClick={() => onFilterChange(key)}
						className={cn(
							'shrink-0 px-3 py-2.5 rounded-full text-xs font-semibold transition min-h-[44px]',
							isActive ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
						)}
					>
						{label}{count > 0 && ` (${count})`}{key === 'scheduled' && overdueCount > 0 && ` · ${overdueCount} overdue`}
					</button>
				);
			})}
		</div>
	);
}
