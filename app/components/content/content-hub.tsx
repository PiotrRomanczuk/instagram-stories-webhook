'use client';

/**
 * Unified Content Hub Component
 * Consolidates meme submissions, schedule management, and admin review into one interface
 */

import React, { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { ContentFilters } from './content-filters';
import { ContentList } from './content-list';
import { ContentPreviewModal } from './content-preview-modal';
import { ContentEditModal } from './content-edit-modal';
import { ContentSubmitForm } from './content-submit-form';
import { Plus, RotateCcw } from 'lucide-react';
import { ContentItem, ContentSource, SubmissionStatus, PublishingStatus } from '@/lib/types/posts';
import type { UserRole } from '@/lib/types/posts';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface ContentHubProps {
	initialTab?: 'all' | 'review' | 'queue' | 'published';
}

type ViewMode = 'grid' | 'list' | 'queue';

export function ContentHub({ initialTab = 'all' }: ContentHubProps) {
	const { data: session } = useSession();
	const searchParams = useSearchParams();

	// State
	const [tab, setTab] = useState<'all' | 'review' | 'queue' | 'published'>(initialTab);
	const [viewMode, setViewMode] = useState<ViewMode>('grid');
	const [search, setSearch] = useState('');
	const [source, setSource] = useState<ContentSource | 'all'>('all');
	const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus | 'all'>('all');
	const [publishingStatus, setPublishingStatus] = useState<PublishingStatus | 'all'>('all');
	const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'schedule-asc'>('newest');
	const [page, setPage] = useState(1);
	const [showPreviewModal, setShowPreviewModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showSubmitForm, setShowSubmitForm] = useState(false);
	const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

	// Build API URL with filters
	const apiParams = new URLSearchParams({
		tab,
		page: String(page),
		limit: viewMode === 'list' ? '10' : '20',
		sortBy,
		...(search && { search }),
		...(source !== 'all' && { source }),
		...(submissionStatus !== 'all' && { submissionStatus }),
		...(publishingStatus !== 'all' && { publishingStatus }),
	});

	// Fetch content items
	const { data, error, isLoading, mutate } = useSWR(
		`/api/content?${apiParams.toString()}`,
		fetcher,
		{
			revalidateOnFocus: false,
			dedupingInterval: 5000,
		},
	);

	// Determine user role
	const userRole = (session?.user as any)?.role as UserRole | undefined;
	const isAdmin = userRole === 'admin' || userRole === 'developer';

	// Handlers
	const handlePreview = useCallback((item: ContentItem) => {
		setSelectedItem(item);
		setShowPreviewModal(true);
	}, []);

	const handleEdit = useCallback((item: ContentItem) => {
		setSelectedItem(item);
		setShowEditModal(true);
	}, []);

	const handleRefresh = useCallback(() => {
		mutate();
	}, [mutate]);

	const handleViewModeChange = useCallback((mode: ViewMode) => {
		setViewMode(mode);
		setPage(1);
	}, []);

	const handleFiltersReset = useCallback(() => {
		setSearch('');
		setSource('all');
		setSubmissionStatus('all');
		setPublishingStatus('all');
		setSortBy('newest');
		setPage(1);
	}, []);

	// Tab-specific labels
	const tabLabels = {
		all: 'All Content',
		review: 'Pending Review',
		queue: 'Queue',
		published: 'Published',
	};

	// Get items from response
	const items = data?.data || [];
	const stats = data?.stats;
	const pagination = data?.pagination;

	// Show loading state
	if (isLoading && !data) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
					<p className="mt-4 text-gray-600">Loading content...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="border-b bg-white">
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Content Hub</h1>
							<p className="mt-1 text-sm text-gray-500">
								Manage submissions, schedule posts, and publish to Instagram
							</p>
						</div>
						<div className="flex gap-2">
							<button
								onClick={handleRefresh}
								className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
								title="Refresh content"
							>
								<RotateCcw className="h-4 w-4" />
							</button>
							<button
								onClick={() => setShowSubmitForm(true)}
								className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center gap-2 font-medium text-sm"
							>
								<Plus className="h-4 w-4" />
								New Post
							</button>
						</div>
					</div>

					{/* Stats */}
					{stats && isAdmin && (
						<div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
							<div className="bg-blue-50 rounded-lg p-4">
								<div className="text-xs font-medium text-blue-900">Submissions</div>
								<div className="text-2xl font-bold text-blue-600">
									{stats.totalSubmissions}
								</div>
							</div>
							<div className="bg-yellow-50 rounded-lg p-4">
								<div className="text-xs font-medium text-yellow-900">Pending</div>
								<div className="text-2xl font-bold text-yellow-600">
									{stats.pendingReview}
								</div>
							</div>
							<div className="bg-green-50 rounded-lg p-4">
								<div className="text-xs font-medium text-green-900">Published</div>
								<div className="text-2xl font-bold text-green-600">
									{stats.published}
								</div>
							</div>
							<div className="bg-red-50 rounded-lg p-4">
								<div className="text-xs font-medium text-red-900">Failed</div>
								<div className="text-2xl font-bold text-red-600">
									{stats.failed}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Content */}
			<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				{/* Tabs */}
				<div className="mb-6 border-b">
					<div className="flex gap-8">
						{['all', 'review', 'queue', 'published'].map((tabName) => {
							const label = tabLabels[tabName as keyof typeof tabLabels];
							if (tabName === 'review' && !isAdmin) return null;
							return (
								<button
									key={tabName}
									onClick={() => setTab(tabName as typeof tab)}
									className={`pb-3 font-medium border-b-2 transition ${
										tab === tabName
											? 'border-indigo-600 text-indigo-600'
											: 'border-transparent text-gray-600 hover:text-gray-900'
									}`}
								>
									{label}
									{tabName === 'review' && stats?.pendingReview ? (
										<span className="ml-2 inline-block h-5 w-5 rounded-full bg-yellow-500 text-xs text-white font-bold">
											{Math.min(stats.pendingReview, 9)}
										</span>
									) : null}
								</button>
							);
						})}
					</div>
				</div>

				{/* Filters */}
				<div className="mb-6">
					<ContentFilters
						onSearchChange={setSearch}
						onSourceChange={setSource}
						onSubmissionStatusChange={setSubmissionStatus}
						onPublishingStatusChange={setPublishingStatus}
						onSortChange={setSortBy}
						onReset={handleFiltersReset}
						onViewModeChange={handleViewModeChange}
						viewMode={viewMode}
						isAdmin={isAdmin}
						tab={tab}
					/>
				</div>

				{/* Content */}
				<div className="space-y-6">
					{/* Empty State */}
					{!isLoading && items.length === 0 && (
						<div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
							<p className="text-gray-500">
								No {tab === 'review' ? 'pending submissions' : 'content'} found
							</p>
							<button
								onClick={() => setShowSubmitForm(true)}
								className="mt-4 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition font-medium text-sm"
							>
								Create New Post
							</button>
						</div>
					)}

					{/* Content List */}
					{items.length > 0 && (
						<ContentList
							items={items}
							viewMode={viewMode}
							onPreview={handlePreview}
							onEdit={handleEdit}
							onRefresh={mutate}
							isAdmin={isAdmin}
							tab={tab}
						/>
					)}

					{/* Pagination */}
					{pagination && pagination.total > 0 && (
						<div className="flex items-center justify-between border-t pt-6">
							<div className="text-sm text-gray-500">
								Showing {(page - 1) * (viewMode === 'list' ? 10 : 20) + 1} to{' '}
								{Math.min(page * (viewMode === 'list' ? 10 : 20), pagination.total)} of{' '}
								{pagination.total} results
							</div>
							<div className="flex gap-2">
								<button
									onClick={() => setPage(Math.max(1, page - 1))}
									disabled={page === 1}
									className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
								>
									Previous
								</button>
								<button
									onClick={() => setPage(page + 1)}
									disabled={!pagination.hasMore}
									className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
								>
									Next
								</button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Modals */}
			{showPreviewModal && selectedItem && (
				<ContentPreviewModal
					item={selectedItem}
					onClose={() => {
						setShowPreviewModal(false);
						setSelectedItem(null);
					}}
					onEdit={handleEdit}
				/>
			)}

			{showEditModal && selectedItem && (
				<ContentEditModal
					item={selectedItem}
					onClose={() => {
						setShowEditModal(false);
						setSelectedItem(null);
					}}
					onSave={mutate}
				/>
			)}

			{showSubmitForm && (
				<ContentSubmitForm
					onClose={() => setShowSubmitForm(false)}
					onSubmit={mutate}
				/>
			)}
		</div>
	);
}
