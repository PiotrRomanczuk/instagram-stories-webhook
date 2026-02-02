'use client';

/**
 * Content Queue Toolbar Component
 * Filters (Status, Creator), Select All checkbox, Grid/List toggle
 */

import { useState } from 'react';
import {
	Filter,
	User,
	ChevronDown,
	LayoutGrid,
	List,
	Trash2,
	CheckSquare,
	Square,
	MinusSquare,
} from 'lucide-react';

export type ViewMode = 'grid' | 'list';
export type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface ContentQueueToolbarProps {
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
	statusFilter: StatusFilter;
	onStatusFilterChange: (status: StatusFilter) => void;
	creatorFilter: string;
	onCreatorFilterChange: (creator: string) => void;
	creators: string[];
	// Selection
	selectedCount: number;
	totalCount: number;
	selectableCount: number;
	onSelectAll: () => void;
	onClearSelection: () => void;
	onBulkDelete?: () => void;
	// Pagination info
	showingFrom: number;
	showingTo: number;
	totalItems: number;
}

export function ContentQueueToolbar({
	viewMode,
	onViewModeChange,
	statusFilter,
	onStatusFilterChange,
	creatorFilter,
	onCreatorFilterChange,
	creators,
	selectedCount,
	totalCount,
	selectableCount,
	onSelectAll,
	onClearSelection,
	onBulkDelete,
	showingFrom,
	showingTo,
	totalItems,
}: ContentQueueToolbarProps) {
	const [showStatusDropdown, setShowStatusDropdown] = useState(false);
	const [showCreatorDropdown, setShowCreatorDropdown] = useState(false);

	const allSelected = selectableCount > 0 && selectedCount === selectableCount;
	const someSelected = selectedCount > 0 && selectedCount < selectableCount;

	const statusLabels: Record<StatusFilter, string> = {
		all: 'All',
		pending: 'Pending',
		approved: 'Approved',
		rejected: 'Rejected',
	};

	const handleCheckboxClick = () => {
		if (allSelected || someSelected) {
			onClearSelection();
		} else {
			onSelectAll();
		}
	};

	return (
		<div className="flex flex-col justify-between gap-4 rounded-xl border border-[#2a3649] bg-[#1a2332] p-2 sm:flex-row sm:items-center">
			<div className="flex flex-wrap items-center gap-2">
				{/* Select All Checkbox */}
				<button
					onClick={handleCheckboxClick}
					className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[#232f48] transition-colors"
					title={allSelected ? 'Deselect all' : 'Select all'}
				>
					{allSelected ? (
						<CheckSquare className="h-5 w-5 text-blue-500" />
					) : someSelected ? (
						<MinusSquare className="h-5 w-5 text-blue-400" />
					) : (
						<Square className="h-5 w-5 text-[#92a4c9]" />
					)}
				</button>

				{/* Status Filter */}
				<div className="relative">
					<button
						onClick={() => {
							setShowStatusDropdown(!showStatusDropdown);
							setShowCreatorDropdown(false);
						}}
						className="flex h-9 items-center gap-2 rounded-lg bg-[#232f48] px-3 text-sm font-medium text-white hover:bg-[#2f3e5c] transition-colors"
					>
						<Filter className="h-4 w-4" />
						Status: {statusLabels[statusFilter]}
						<ChevronDown className="h-4 w-4" />
					</button>
					{showStatusDropdown && (
						<div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-[#2a3649] bg-[#1a2332] py-1 shadow-xl">
							{(Object.keys(statusLabels) as StatusFilter[]).map((status) => (
								<button
									key={status}
									onClick={() => {
										onStatusFilterChange(status);
										setShowStatusDropdown(false);
									}}
									className={`w-full px-3 py-2 text-left text-sm hover:bg-[#232f48] transition-colors ${
										statusFilter === status ? 'text-blue-400 font-medium' : 'text-white'
									}`}
								>
									{statusLabels[status]}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Creator Filter */}
				<div className="relative">
					<button
						onClick={() => {
							setShowCreatorDropdown(!showCreatorDropdown);
							setShowStatusDropdown(false);
						}}
						className="flex h-9 items-center gap-2 rounded-lg bg-[#232f48] px-3 text-sm font-medium text-white hover:bg-[#2f3e5c] transition-colors"
					>
						<User className="h-4 w-4" />
						{creatorFilter || 'Creator'}
						<ChevronDown className="h-4 w-4" />
					</button>
					{showCreatorDropdown && (
						<div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-48 overflow-y-auto rounded-lg border border-[#2a3649] bg-[#1a2332] py-1 shadow-xl">
							<button
								onClick={() => {
									onCreatorFilterChange('');
									setShowCreatorDropdown(false);
								}}
								className={`w-full px-3 py-2 text-left text-sm hover:bg-[#232f48] transition-colors ${
									!creatorFilter ? 'text-blue-400 font-medium' : 'text-white'
								}`}
							>
								All Creators
							</button>
							{creators.map((creator) => (
								<button
									key={creator}
									onClick={() => {
										onCreatorFilterChange(creator);
										setShowCreatorDropdown(false);
									}}
									className={`w-full px-3 py-2 text-left text-sm hover:bg-[#232f48] transition-colors truncate ${
										creatorFilter === creator ? 'text-blue-400 font-medium' : 'text-white'
									}`}
								>
									{creator}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Divider */}
				<div className="hidden h-6 w-px bg-[#2a3649] sm:block" />

				{/* Bulk Delete */}
				{selectedCount > 0 && onBulkDelete && (
					<button
						onClick={onBulkDelete}
						className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[#92a4c9] hover:bg-[#232f48] hover:text-red-400 transition-colors"
					>
						<Trash2 className="h-4 w-4 text-red-400" />
						<span className="hidden sm:inline">Delete ({selectedCount})</span>
					</button>
				)}
			</div>

			<div className="flex items-center gap-2 self-end sm:self-auto">
				<span className="mr-2 text-xs font-medium text-[#92a4c9]">
					Showing {showingFrom}-{showingTo} of {totalItems}
				</span>
				<button
					onClick={() => onViewModeChange('grid')}
					className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
						viewMode === 'grid'
							? 'bg-[#232f48] text-white'
							: 'text-[#92a4c9] hover:bg-[#232f48] hover:text-white'
					}`}
					title="Grid view"
				>
					<LayoutGrid className="h-5 w-5" />
				</button>
				<button
					onClick={() => onViewModeChange('list')}
					className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
						viewMode === 'list'
							? 'bg-[#232f48] text-white'
							: 'text-[#92a4c9] hover:bg-[#232f48] hover:text-white'
					}`}
					title="List view"
				>
					<List className="h-5 w-5" />
				</button>
			</div>
		</div>
	);
}
