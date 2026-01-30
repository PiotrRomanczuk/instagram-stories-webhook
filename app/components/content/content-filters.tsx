'use client';

/**
 * Unified Content Filters Component
 * Provides search, filtering, and sorting options for content hub
 * Includes active filter chips for quick visibility and removal
 */

import React, { useState } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { ContentSource, SubmissionStatus, PublishingStatus } from '@/lib/types/posts';

interface ContentFiltersProps {
	onSearchChange: (search: string) => void;
	onSourceChange: (source: ContentSource | 'all') => void;
	onSubmissionStatusChange: (status: SubmissionStatus | 'all') => void;
	onPublishingStatusChange: (status: PublishingStatus | 'all') => void;
	onSortChange: (sort: 'newest' | 'oldest' | 'schedule-asc') => void;
	onReset: () => void;
	isAdmin: boolean;
	tab: 'all' | 'review' | 'queue' | 'published';
	// Current filter values for chips
	currentSearch?: string;
	currentSource?: ContentSource | 'all';
	currentSubmissionStatus?: SubmissionStatus | 'all';
	currentPublishingStatus?: PublishingStatus | 'all';
	currentSortBy?: 'newest' | 'oldest' | 'schedule-asc';
}

/**
 * Filter Chip Component
 */
function FilterChip({
	label,
	value,
	onRemove,
	color = 'indigo',
}: {
	label: string;
	value: string;
	onRemove: () => void;
	color?: 'indigo' | 'amber' | 'emerald' | 'rose';
}) {
	const colorClasses = {
		indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
		amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
		emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
		rose: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
	};

	return (
		<span
			className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${colorClasses[color]}`}
		>
			<span className="text-[10px] uppercase tracking-wider opacity-60">{label}:</span>
			<span>{value}</span>
			<button
				onClick={onRemove}
				className="ml-1 p-0.5 rounded-full hover:bg-black/10 transition-colors"
				title={`Remove ${label} filter`}
			>
				<X className="h-3 w-3" />
			</button>
		</span>
	);
}

export function ContentFilters({
	onSearchChange,
	onSourceChange,
	onSubmissionStatusChange,
	onPublishingStatusChange,
	onSortChange,
	onReset,
	isAdmin,
	tab,
	currentSearch = '',
	currentSource = 'all',
	currentSubmissionStatus = 'all',
	currentPublishingStatus = 'all',
	currentSortBy = 'newest',
}: ContentFiltersProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [localSearch, setLocalSearch] = useState(currentSearch);

	// Check if any filters are active
	const hasActiveFilters =
		currentSearch ||
		currentSource !== 'all' ||
		currentSubmissionStatus !== 'all' ||
		currentPublishingStatus !== 'all' ||
		currentSortBy !== 'newest';

	// Labels for display
	const sourceLabels: Record<string, string> = {
		submission: 'Submissions',
		direct: 'Direct posts',
	};
	const submissionStatusLabels: Record<string, string> = {
		pending: 'Pending',
		approved: 'Approved',
		rejected: 'Rejected',
	};
	const publishingStatusLabels: Record<string, string> = {
		draft: 'Draft',
		scheduled: 'Scheduled',
		processing: 'Processing',
		published: 'Published',
		failed: 'Failed',
	};
	const sortLabels: Record<string, string> = {
		newest: 'Newest first',
		oldest: 'Oldest first',
		'schedule-asc': 'Schedule time',
	};

	// Handle search with local state for controlled input
	const handleSearchChange = (value: string) => {
		setLocalSearch(value);
		onSearchChange(value);
	};

	return (
		<div className="space-y-4">
			{/* Active Filter Chips */}
			{hasActiveFilters && (
				<div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
					<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">
						Active Filters:
					</span>

					{currentSearch && (
						<FilterChip
							label="Search"
							value={`"${currentSearch}"`}
							onRemove={() => {
								setLocalSearch('');
								onSearchChange('');
							}}
							color="indigo"
						/>
					)}

					{currentSource !== 'all' && (
						<FilterChip
							label="Source"
							value={sourceLabels[currentSource] || currentSource}
							onRemove={() => onSourceChange('all')}
							color="amber"
						/>
					)}

					{currentSubmissionStatus !== 'all' && (
						<FilterChip
							label="Review"
							value={submissionStatusLabels[currentSubmissionStatus] || currentSubmissionStatus}
							onRemove={() => onSubmissionStatusChange('all')}
							color={currentSubmissionStatus === 'approved' ? 'emerald' : currentSubmissionStatus === 'rejected' ? 'rose' : 'amber'}
						/>
					)}

					{currentPublishingStatus !== 'all' && (
						<FilterChip
							label="Status"
							value={publishingStatusLabels[currentPublishingStatus] || currentPublishingStatus}
							onRemove={() => onPublishingStatusChange('all')}
							color={currentPublishingStatus === 'published' ? 'emerald' : currentPublishingStatus === 'failed' ? 'rose' : 'amber'}
						/>
					)}

					{currentSortBy !== 'newest' && (
						<FilterChip
							label="Sort"
							value={sortLabels[currentSortBy] || currentSortBy}
							onRemove={() => onSortChange('newest')}
							color="indigo"
						/>
					)}

					<button
						onClick={onReset}
						className="ml-auto px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
					>
						Clear All
					</button>
				</div>
			)}

			{/* Search bar */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
				<input
					type="text"
					placeholder="Search caption, title..."
					value={localSearch}
					onChange={(e) => handleSearchChange(e.target.value)}
					className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
				/>
			</div>

			{/* Advanced filters (collapsible) */}
			<div>
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition font-medium text-sm flex items-center justify-between"
				>
					Advanced Filters
					<ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
				</button>

				{isExpanded && (
					<div className="mt-4 grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
						{/* Source filter */}
						{tab === 'all' && (
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700">
									Source
								</label>
								<select
									onChange={(e) => onSourceChange(e.target.value as any)}
									className="w-full px-3 py-2 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-indigo-500"
								>
									<option value="all">All sources</option>
									<option value="submission">Submissions</option>
									<option value="direct">Direct posts</option>
								</select>
							</div>
						)}

						{/* Submission status filter */}
						{(tab === 'all' || tab === 'review') && isAdmin && (
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700">
									Submission Status
								</label>
								<select
									onChange={(e) => onSubmissionStatusChange(e.target.value as any)}
									className="w-full px-3 py-2 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-indigo-500"
								>
									<option value="all">All statuses</option>
									<option value="pending">Pending</option>
									<option value="approved">Approved</option>
									<option value="rejected">Rejected</option>
								</select>
							</div>
						)}

						{/* Publishing status filter */}
						{tab === 'all' && (
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700">
									Publishing Status
								</label>
								<select
									onChange={(e) => onPublishingStatusChange(e.target.value as any)}
									className="w-full px-3 py-2 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-indigo-500"
								>
									<option value="all">All statuses</option>
									<option value="draft">Draft</option>
									<option value="scheduled">Scheduled</option>
									<option value="processing">Processing</option>
									<option value="published">Published</option>
									<option value="failed">Failed</option>
								</select>
							</div>
						)}

						{/* Sort */}
						<div className="space-y-2">
							<label className="text-sm font-medium text-gray-700">
								Sort by
							</label>
							<select
								onChange={(e) => onSortChange(e.target.value as any)}
								className="w-full px-3 py-2 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-indigo-500"
							>
								<option value="newest">Newest first</option>
								<option value="oldest">Oldest first</option>
								{tab === 'queue' && (
									<option value="schedule-asc">Schedule time</option>
								)}
							</select>
						</div>

						{/* Reset button */}
						<div className="flex items-end">
							<button
								onClick={onReset}
								className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition font-medium text-sm"
							>
								Reset filters
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
