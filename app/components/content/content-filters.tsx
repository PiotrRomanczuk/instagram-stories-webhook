'use client';

/**
 * Unified Content Filters Component
 * Provides search, filtering, and sorting options for content hub
 */

import React, { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
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
}: ContentFiltersProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className="space-y-4">
			{/* Search bar */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
				<input
					type="text"
					placeholder="Search caption, title..."
					onChange={(e) => onSearchChange(e.target.value)}
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
