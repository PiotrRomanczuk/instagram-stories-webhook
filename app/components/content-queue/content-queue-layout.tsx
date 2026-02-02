'use client';

/**
 * Content Queue Layout Component
 * Main layout wrapper for the StoryFlow Content Queue Dashboard
 */

import { useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { ContentQueueHeader, ContentQueueStats } from './content-queue-header';
import { ContentQueueToolbar, ViewMode, StatusFilter } from './content-queue-toolbar';
import { ContentQueueGrid } from './content-queue-grid';
import { ContentQueuePageHeader } from './content-queue-page-header';
import { ContentPreviewModal } from '../content/content-preview-modal';
import { ContentEditModal } from '../content/content-edit-modal';
import { ContentItem } from '@/lib/types/posts';
import type { UserRole } from '@/lib/types/posts';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ContentQueueLayoutProps {
	initialTab?: 'review' | 'all';
}

export function ContentQueueLayout({ initialTab = 'review' }: ContentQueueLayoutProps) {
	const { data: session } = useSession();

	// View state
	const [viewMode, setViewMode] = useState<ViewMode>('grid');
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [creatorFilter, setCreatorFilter] = useState('');
	const [page, setPage] = useState(1);

	// Selection state
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// Modal state
	const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
	const [editItem, setEditItem] = useState<ContentItem | null>(null);
	const [previewIndex, setPreviewIndex] = useState(0);

	// Determine user role
	const userRole = (session?.user as { role?: UserRole })?.role;
	const isAdmin = userRole === 'admin' || userRole === 'developer';

	// Build API URL with filters
	const apiParams = new URLSearchParams({
		tab: initialTab,
		page: String(page),
		limit: '24',
		sortBy: 'newest',
		...(searchQuery && { search: searchQuery }),
		...(statusFilter !== 'all' && { submissionStatus: statusFilter }),
		...(creatorFilter && { creator: creatorFilter }),
	});

	// Fetch content items
	const { data, error, isLoading, mutate } = useSWR(
		`/api/content?${apiParams.toString()}`,
		fetcher,
		{
			revalidateOnFocus: false,
			dedupingInterval: 5000,
		}
	);

	const items: ContentItem[] = data?.items || [];
	const pagination = data?.pagination;
	const apiStats = data?.stats;

	// Compute stats for header
	const stats: ContentQueueStats = useMemo(() => {
		if (apiStats) {
			return {
				pendingReview: apiStats.pendingReview || 0,
				readyToPublish: apiStats.approved || apiStats.readyToPublish || 0,
				publishedToday: apiStats.publishedToday || apiStats.published || 0,
				rejected: apiStats.rejected || 0,
			};
		}
		// Fallback: compute from items
		return {
			pendingReview: items.filter((i) => i.submissionStatus === 'pending').length,
			readyToPublish: items.filter((i) => i.submissionStatus === 'approved').length,
			publishedToday: items.filter((i) => i.publishingStatus === 'published').length,
			rejected: items.filter((i) => i.submissionStatus === 'rejected').length,
		};
	}, [items, apiStats]);

	// Get unique creators for filter
	const creators = useMemo(() => {
		const creatorSet = new Set<string>();
		items.forEach((item) => {
			if (item.userEmail) {
				const name = item.userEmail.split('@')[0];
				if (name && !/^[0-9a-f-]{36}$/i.test(name)) {
					creatorSet.add(name);
				}
			}
		});
		return Array.from(creatorSet).sort();
	}, [items]);

	// Filter items client-side for creator (if not handled by API)
	const filteredItems = useMemo(() => {
		if (!creatorFilter) return items;
		return items.filter((item) => {
			const name = item.userEmail?.split('@')[0] || '';
			return name.toLowerCase().includes(creatorFilter.toLowerCase());
		});
	}, [items, creatorFilter]);

	// Selection handlers
	const handleSelect = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const handleSelectAll = useCallback(() => {
		setSelectedIds(new Set(filteredItems.map((item) => item.id)));
	}, [filteredItems]);

	const handleClearSelection = useCallback(() => {
		setSelectedIds(new Set());
	}, []);

	// Preview handlers
	const handlePreview = useCallback((item: ContentItem) => {
		const index = filteredItems.findIndex((i) => i.id === item.id);
		setPreviewItem(item);
		setPreviewIndex(index >= 0 ? index : 0);
	}, [filteredItems]);

	const handleNavigate = useCallback((item: ContentItem, index: number) => {
		setPreviewItem(item);
		setPreviewIndex(index);
	}, []);

	// Edit handler
	const handleEdit = useCallback((item: ContentItem) => {
		setEditItem(item);
	}, []);

	// Approve handler
	const handleApprove = useCallback(async (item: ContentItem) => {
		try {
			const response = await fetch(`/api/content/${item.id}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'approve' }),
			});
			if (response.ok) {
				mutate();
			}
		} catch (err) {
			console.error('Failed to approve:', err);
		}
	}, [mutate]);

	// Refresh handler
	const handleRefresh = useCallback(() => {
		mutate();
	}, [mutate]);

	// Pagination
	const showingFrom = filteredItems.length > 0 ? (page - 1) * 24 + 1 : 0;
	const showingTo = Math.min(page * 24, pagination?.total || filteredItems.length);
	const totalItems = pagination?.total || filteredItems.length;

	return (
		<div className="min-h-screen bg-[#101622]">
			<ContentQueuePageHeader
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				onRefresh={handleRefresh}
				isLoading={isLoading}
			/>

			{/* Main Content */}
			<div className="flex flex-1 flex-col p-6 sm:px-8">
				{/* Stats Cards */}
				<div className="mb-8">
					<ContentQueueHeader stats={stats} isLoading={isLoading} />
				</div>

				{/* Toolbar */}
				<div className="mb-6">
					<ContentQueueToolbar
						viewMode={viewMode}
						onViewModeChange={setViewMode}
						statusFilter={statusFilter}
						onStatusFilterChange={(status) => {
							setStatusFilter(status);
							setPage(1);
						}}
						creatorFilter={creatorFilter}
						onCreatorFilterChange={(creator) => {
							setCreatorFilter(creator);
							setPage(1);
						}}
						creators={creators}
						selectedCount={selectedIds.size}
						totalCount={filteredItems.length}
						selectableCount={filteredItems.length}
						onSelectAll={handleSelectAll}
						onClearSelection={handleClearSelection}
						showingFrom={showingFrom}
						showingTo={showingTo}
						totalItems={totalItems}
					/>
				</div>

				{/* Content Grid */}
				<ContentQueueGrid
					items={filteredItems}
					selectedIds={selectedIds}
					onSelect={handleSelect}
					onPreview={handlePreview}
					onEdit={handleEdit}
					onApprove={isAdmin ? handleApprove : undefined}
					isAdmin={isAdmin}
					isLoading={isLoading}
					hasMore={pagination?.hasMore}
					onLoadMore={() => setPage((p) => p + 1)}
				/>
			</div>

			{/* Preview Modal */}
			{previewItem && (
				<ContentPreviewModal
					item={previewItem}
					onClose={() => setPreviewItem(null)}
					onEdit={handleEdit}
					onRefresh={mutate}
					isAdmin={isAdmin}
					items={filteredItems}
					currentIndex={previewIndex}
					onNavigate={handleNavigate}
				/>
			)}

			{/* Edit Modal */}
			{editItem && (
				<ContentEditModal
					item={editItem}
					onClose={() => setEditItem(null)}
					onSave={mutate}
				/>
			)}
		</div>
	);
}
