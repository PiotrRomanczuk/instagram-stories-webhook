'use client';

import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export type SortColumn = 'creator' | 'status' | 'scheduled';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
	column: SortColumn | null;
	direction: SortDirection;
}

/**
 * Sortable Column Header Component
 */
export function SortableHeader({
	label,
	column,
	currentSort,
	onSort,
	children,
}: {
	label: string;
	column: SortColumn;
	currentSort: SortConfig;
	onSort: (column: SortColumn) => void;
	children?: React.ReactNode;
}) {
	const isActive = currentSort.column === column;

	return (
		<th className='px-6 py-5 text-left'>
			<button
				onClick={() => onSort(column)}
				className='flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-colors group'
			>
				{children}
				{label}
				<span className='ml-0.5'>
					{isActive ? (
						currentSort.direction === 'asc' ? (
							<ArrowUp className='h-3 w-3 text-indigo-500' />
						) : (
							<ArrowDown className='h-3 w-3 text-indigo-500' />
						)
					) : (
						<ArrowUpDown className='h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity' />
					)}
				</span>
			</button>
		</th>
	);
}
