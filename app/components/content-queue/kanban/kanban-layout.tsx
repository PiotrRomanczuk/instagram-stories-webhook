'use client';

/**
 * Kanban Layout Component
 * Main layout wrapper for the StoryFlow Kanban Content Queue
 * Integrates header, sidebar, and kanban board
 */

import { useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from '@/i18n/routing';
import useSWR from 'swr';
import { KanbanHeader, KanbanToolbar } from './kanban-header';
import { KanbanSidebar } from './kanban-sidebar';
import { KanbanBoard } from './kanban-board';
import { ContentPreviewModal } from '../../content/content-preview-modal';
import { ContentEditModal } from '../../content/content-edit-modal';
import { ContentItem } from '@/lib/types/posts';
import type { UserRole } from '@/lib/types/posts';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ViewType = 'kanban' | 'list' | 'timeline';

export function KanbanLayout() {
	const { data: session } = useSession();
	const router = useRouter();

	// View state
	const [currentView, setCurrentView] = useState<ViewType>('kanban');
	const [searchQuery, setSearchQuery] = useState('');

	// Modal state
	const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
	const [editItem, setEditItem] = useState<ContentItem | null>(null);
	const [previewIndex, setPreviewIndex] = useState(0);

	// Determine user role
	const userRole = (session?.user as { role?: UserRole })?.role;
	const isAdmin = userRole === 'admin' || userRole === 'developer' || userRole === 'demo';
	const isDemo = userRole === 'demo';

	// Build API URL - fetch all items for kanban view
	const apiParams = new URLSearchParams({
		tab: 'all',
		limit: '100',
		sortBy: 'newest',
		...(searchQuery && { search: searchQuery }),
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

	const items: ContentItem[] = useMemo(() => data?.items || [], [data?.items]);

	// Get scheduled dates for calendar
	const scheduledDates = useMemo(() => {
		return items
			.filter((item) => item.scheduledTime)
			.map((item) => item.scheduledTime as number);
	}, [items]);

	// Calculate total active items
	const totalActive = useMemo(() => {
		return items.filter(
			(item) =>
				item.publishingStatus !== 'published' && item.publishingStatus !== 'failed'
		).length;
	}, [items]);

	// Filter items based on search
	const filteredItems = useMemo(() => {
		if (!searchQuery) return items;
		const query = searchQuery.toLowerCase();
		return items.filter(
			(item) =>
				item.title?.toLowerCase().includes(query) ||
				item.userEmail?.toLowerCase().includes(query) ||
				item.caption?.toLowerCase().includes(query)
		);
	}, [items, searchQuery]);

	// Preview handlers
	const handlePreview = useCallback(
		(item: ContentItem) => {
			const index = filteredItems.findIndex((i) => i.id === item.id);
			setPreviewItem(item);
			setPreviewIndex(index >= 0 ? index : 0);
		},
		[filteredItems]
	);

	const handleNavigate = useCallback((item: ContentItem, index: number) => {
		setPreviewItem(item);
		setPreviewIndex(index);
	}, []);

	// Edit handler
	const handleEdit = useCallback((item: ContentItem) => {
		setEditItem(item);
	}, []);

	// Refresh handler
	const handleRefresh = useCallback(() => {
		mutate();
	}, [mutate]);

	// Quick schedule from calendar
	const handleQuickSchedule = useCallback((date: Date) => {
		console.log('Quick schedule for:', date);
	}, []);

	// Create new story
	const handleCreateStory = useCallback(() => {
		console.log('Create new story');
	}, []);

	// Handle view change - navigate to different pages for list/timeline views
	const handleViewChange = useCallback((view: ViewType) => {
		if (view === 'list') {
			router.push('/content?view=list');
		} else if (view === 'timeline') {
			router.push('/schedule');
		} else {
			setCurrentView(view);
		}
	}, [router]);

	return (
		<div className="h-screen flex flex-col overflow-hidden bg-gray-50">
			{/* Top Header */}
			<KanbanHeader
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				onCreateStory={handleCreateStory}
				totalActive={totalActive}
			/>

			{/* Main Content Area */}
			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar */}
				<KanbanSidebar
					currentView={currentView}
					onViewChange={handleViewChange}
					onQuickSchedule={handleQuickSchedule}
					scheduledDates={scheduledDates}
				/>

				{/* Main Content */}
				<main className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
					{/* Toolbar */}
					<KanbanToolbar totalActive={totalActive} />

					{/* Kanban Board */}
					<KanbanBoard
						items={filteredItems}
						onPreview={handlePreview}
						onEdit={handleEdit}
						onAddNew={handleCreateStory}
						isLoading={isLoading}
					/>
				</main>
			</div>

			{/* Preview Modal */}
			{previewItem && (
				<ContentPreviewModal
					item={previewItem}
					onClose={() => setPreviewItem(null)}
					onEdit={handleEdit}
					onRefresh={mutate}
					isAdmin={isAdmin}
					isDemo={isDemo}
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
