'use client';

import { Search, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/app/components/ui/toggle-group';

interface MemeSearchFilterProps {
	onSearchChange: (query: string) => void;
	onStatusChange: (status: string) => void;
	query: string;
	status: string;
}

export function MemeSearchFilter({
	onSearchChange,
	onStatusChange,
	query,
	status,
}: MemeSearchFilterProps) {
	const [localQuery, setLocalQuery] = useState(query);

	const handleSearchChange = useCallback(
		(value: string) => {
			setLocalQuery(value);
			onSearchChange(value);
		},
		[onSearchChange],
	);

	const handleClear = useCallback(() => {
		setLocalQuery('');
		onSearchChange('');
	}, [onSearchChange]);

	return (
		<div className='space-y-4'>
			{/* Search Input */}
			<div className='relative'>
				<Search className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
				<Input
					type='text'
					placeholder='Search by title or caption...'
					value={localQuery}
					onChange={(e) => handleSearchChange(e.target.value)}
					className='pl-12 pr-10 py-3 rounded-xl'
					data-testid='search-input'
				/>
				{localQuery && (
					<Button
						variant='ghost'
						size='icon'
						onClick={handleClear}
						className='absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8'
					>
						<X className='w-5 h-5' />
					</Button>
				)}
			</div>

			{/* Status Filter */}
			<ToggleGroup
				type='single'
				value={status === '' ? 'all' : status}
				onValueChange={(value) => {
					if (value) {
						onStatusChange(value === 'all' ? '' : value);
					}
				}}
				className='flex flex-wrap gap-2 justify-start'
			>
				{[
					'all',
					'pending',
					'approved',
					'published',
					'rejected',
					'scheduled',
				].map((s) => (
					<ToggleGroupItem
						key={s}
						value={s}
						className='px-4 py-2 rounded-lg text-sm font-medium data-[state=on]:bg-indigo-600 data-[state=on]:text-white data-[state=on]:shadow-lg data-[state=on]:shadow-indigo-100'
					>
						{s.charAt(0).toUpperCase() + s.slice(1)}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}
