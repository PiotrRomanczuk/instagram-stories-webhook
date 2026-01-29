'use client';

import { Search, X, ChevronDown, Calendar } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';

interface MemeAdvancedFiltersProps {
	onSearchChange: (query: string) => void;
	onStatusChange: (status: string) => void;
	onSortChange: (sort: string) => void;
	onDateRangeChange: (from: string | null, to: string | null) => void;
	onUserFilterChange?: (email: string) => void;
	query: string;
	status: string;
	sort: string;
	dateFrom?: string;
	dateTo?: string;
	isAdmin?: boolean;
}

type SortOption = 'newest' | 'oldest' | 'a-z' | 'z-a';

export function MemeAdvancedFilters({
	onSearchChange,
	onStatusChange,
	onSortChange,
	onDateRangeChange,
	onUserFilterChange,
	query,
	status,
	sort,
	dateFrom,
	dateTo,
	isAdmin = false,
}: MemeAdvancedFiltersProps) {
	const [localQuery, setLocalQuery] = useState(query);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [showSort, setShowSort] = useState(false);
	const [localDateFrom, setLocalDateFrom] = useState(dateFrom || '');
	const [localDateTo, setLocalDateTo] = useState(dateTo || '');
	const [userFilter, setUserFilter] = useState('');
	const debounceTimer = useRef<NodeJS.Timeout | null>(null);

	// Debounced search
	const handleSearchChange = useCallback(
		(value: string) => {
			setLocalQuery(value);
			if (debounceTimer.current) clearTimeout(debounceTimer.current);
			debounceTimer.current = setTimeout(() => {
				onSearchChange(value);
			}, 300);
		},
		[onSearchChange],
	);

	const handleClear = useCallback(() => {
		setLocalQuery('');
		onSearchChange('');
	}, [onSearchChange]);

	const handleDateFromChange = (value: string) => {
		setLocalDateFrom(value);
		onDateRangeChange(value || null, localDateTo || null);
	};

	const handleDateToChange = (value: string) => {
		setLocalDateTo(value);
		onDateRangeChange(localDateFrom || null, value || null);
	};

	const handleClearDates = () => {
		setLocalDateFrom('');
		setLocalDateTo('');
		onDateRangeChange(null, null);
	};

	const handleUserFilterChange = (email: string) => {
		setUserFilter(email);
		onUserFilterChange?.(email);
	};

	const sortOptions: { label: string; value: SortOption }[] = [
		{ label: 'Newest First', value: 'newest' },
		{ label: 'Oldest First', value: 'oldest' },
		{ label: 'Title A-Z', value: 'a-z' },
		{ label: 'Title Z-A', value: 'z-a' },
	];

	const hasActiveFilters = dateFrom || dateTo || userFilter;

	return (
		<div className='space-y-4'>
			{/* Search Input */}
			<div className='relative'>
				<Search className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
				<input
					type='text'
					placeholder='Search by title, caption, or username...'
					value={localQuery}
					onChange={(e) => handleSearchChange(e.target.value)}
					className='w-full pl-12 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all'
					data-testid='search-input'
				/>
				{localQuery && (
					<button
						onClick={handleClear}
						className='absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors'
						aria-label='Clear search'
					>
						<X className='w-5 h-5' />
					</button>
				)}
			</div>

			{/* Status Filters */}
			<div className='flex flex-wrap gap-2'>
				{[
					'all',
					'pending',
					'approved',
					'published',
					'rejected',
					'scheduled',
				].map((s) => (
					<button
						key={s}
						onClick={() => onStatusChange(s === 'all' ? '' : s)}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
							(status === '' && s === 'all') || status === s
								? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
								: 'bg-slate-100 text-slate-700 hover:bg-slate-200'
						}`}
					>
						{s.charAt(0).toUpperCase() + s.slice(1)}
					</button>
				))}
			</div>

			{/* Sort & Advanced Filters Row */}
			<div className='flex flex-wrap gap-3 items-center'>
				{/* Sort Dropdown */}
				<div className='relative'>
					<button
						onClick={() => setShowSort(!showSort)}
						className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all text-sm font-medium'
					>
						Sort
						<ChevronDown
							className={`w-4 h-4 transition-transform ${
								showSort ? 'rotate-180' : ''
							}`}
						/>
					</button>
					{showSort && (
						<div className='absolute top-full mt-2 left-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-48'>
							{sortOptions.map((option) => (
								<button
									key={option.value}
									onClick={() => {
										onSortChange(option.value);
										setShowSort(false);
									}}
									className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
										sort === option.value
											? 'bg-indigo-50 text-indigo-600'
											: 'text-slate-700 hover:bg-slate-50'
									}`}
								>
									{option.label}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Advanced Filters Toggle */}
				<button
					onClick={() => setShowAdvanced(!showAdvanced)}
					className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
						showAdvanced || hasActiveFilters
							? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
							: 'bg-slate-100 text-slate-700 hover:bg-slate-200'
					}`}
				>
					<Calendar className='w-4 h-4' />
					Filters
					{hasActiveFilters && (
						<span className='ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-black'>
							{[dateFrom, dateTo, userFilter].filter(Boolean).length}
						</span>
					)}
				</button>
			</div>

			{/* Advanced Filters Panel */}
			{showAdvanced && (
				<div className='bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200'>
					{/* Date Range */}
					<div className='space-y-2'>
						<label className='text-xs font-bold text-slate-600 uppercase tracking-wide'>
							Submitted Date
						</label>
						<div className='flex gap-2'>
							<div className='flex-1'>
								<input
									type='date'
									value={localDateFrom}
									onChange={(e) =>
										handleDateFromChange(e.target.value)
									}
									className='w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm'
									placeholder='From'
								/>
							</div>
							<div className='flex items-center text-slate-400'>
								→
							</div>
							<div className='flex-1'>
								<input
									type='date'
									value={localDateTo}
									onChange={(e) =>
										handleDateToChange(e.target.value)
									}
									className='w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm'
									placeholder='To'
									min={localDateFrom}
								/>
							</div>
						</div>
						{(localDateFrom || localDateTo) && (
							<button
								onClick={handleClearDates}
								className='text-xs text-slate-500 hover:text-slate-700 font-medium'
							>
								Clear dates
							</button>
						)}
					</div>

					{/* User Filter (Admin only) */}
					{isAdmin && (
						<div className='space-y-2'>
							<label className='text-xs font-bold text-slate-600 uppercase tracking-wide'>
								Filter by User Email
							</label>
							<input
								type='email'
								value={userFilter}
								onChange={(e) =>
									handleUserFilterChange(e.target.value)
								}
								placeholder='user@example.com'
								className='w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm'
							/>
							{userFilter && (
								<button
									onClick={() => handleUserFilterChange('')}
									className='text-xs text-slate-500 hover:text-slate-700 font-medium'
								>
									Clear user filter
								</button>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
