'use client';

import React from 'react';
import { CheckSquare, Square, MinusSquare, BarChart3 } from 'lucide-react';
import { SortableHeader, SortConfig } from './content-list.sortable-header';

interface ContentListTableHeaderProps {
	tab: 'all' | 'review' | 'queue' | 'published' | 'rejected';
	isQueueTab: boolean;
	showBulkSelection: boolean;
	allSelectableSelected: boolean;
	someSelectableSelected: boolean;
	sortConfig: SortConfig;
	onToggleSelectAll: () => void;
	onSort: (column: 'creator' | 'status' | 'scheduled') => void;
}

/**
 * Table header row for the list view
 */
export function ContentListTableHeader({
	tab,
	isQueueTab,
	showBulkSelection,
	allSelectableSelected,
	someSelectableSelected,
	sortConfig,
	onToggleSelectAll,
	onSort,
}: ContentListTableHeaderProps) {
	return (
		<tr className='bg-gray-50/50 border-b border-gray-100'>
			{showBulkSelection && (
				<th className='w-12 px-4 py-5'>
					<button
						onClick={onToggleSelectAll}
						className='p-1 hover:bg-gray-100 rounded transition-colors'
						title={allSelectableSelected ? 'Deselect all' : 'Select all pending'}
					>
						{allSelectableSelected ? (
							<CheckSquare className='h-5 w-5 text-indigo-600' />
						) : someSelectableSelected ? (
							<MinusSquare className='h-5 w-5 text-indigo-400' />
						) : (
							<Square className='h-5 w-5 text-gray-300' />
						)}
					</button>
				</th>
			)}
			{isQueueTab && <th className='w-12 px-2 py-5'></th>}
			<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
				Media
			</th>
			<SortableHeader label='Creator' column='creator' currentSort={sortConfig} onSort={onSort} />
			<SortableHeader label='Status' column='status' currentSort={sortConfig} onSort={onSort} />
			<SortableHeader label='Scheduled' column='scheduled' currentSort={sortConfig} onSort={onSort} />
			{tab === 'published' && (
				<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
					<div className='flex items-center gap-1'>
						<BarChart3 className='h-3 w-3' />
						Insights
					</div>
				</th>
			)}
			<th className='px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
				Actions
			</th>
		</tr>
	);
}
