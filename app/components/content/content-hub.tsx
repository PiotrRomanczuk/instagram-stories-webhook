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
import {
	Plus,
	RotateCcw,
	LayoutGrid,
	List,
	Clock,
	Sparkles,
	TrendingUp,
	Inbox,
	CheckCircle2,
	AlertCircle,
} from 'lucide-react';
import {
	ContentItem,
	ContentSource,
	SubmissionStatus,
	PublishingStatus,
} from '@/lib/types/posts';
import type { UserRole } from '@/lib/types/posts';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ContentHubProps {
	initialTab?: 'all' | 'review' | 'queue' | 'published';
}

type ViewMode = 'grid' | 'list';

export function ContentHub({ initialTab = 'all' }: ContentHubProps) {
	const { data: session } = useSession();
	const searchParams = useSearchParams();

	// State
	const [tab, setTab] = useState<'all' | 'review' | 'queue' | 'published'>(
		initialTab,
	);
	const [viewMode, setViewMode] = useState<ViewMode>('grid');
	const [search, setSearch] = useState('');
	const [source, setSource] = useState<ContentSource | 'all'>('all');
	const [submissionStatus, setSubmissionStatus] = useState<
		SubmissionStatus | 'all'
	>('all');
	const [publishingStatus, setPublishingStatus] = useState<
		PublishingStatus | 'all'
	>('all');
	const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'schedule-asc'>(
		'newest',
	);
	const [page, setPage] = useState(1);
	const [showPreviewModal, setShowPreviewModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showSubmitForm, setShowSubmitForm] = useState(false);
	const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

	// Build API URL with filters
	const apiParams = new URLSearchParams({
		tab,
		page: String(page),
		limit: viewMode === 'list' ? '12' : '24',
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

	// Tab configuration
	const tabs = [
		{ id: 'all', label: 'Discovery', icon: <Sparkles className='h-4 w-4' /> },
		...(isAdmin
			? [{ id: 'review', label: 'Inbox', icon: <Inbox className='h-4 w-4' /> }]
			: []),
		{ id: 'queue', label: 'Schedule', icon: <Clock className='h-4 w-4' /> },
		{
			id: 'published',
			label: 'Catalog',
			icon: <CheckCircle2 className='h-4 w-4' />,
		},
	];

	// Get items from response
	const items = data?.data || [];
	const stats = data?.stats;
	const pagination = data?.pagination;

	return (
		<div className='min-h-screen bg-[#FDFCFD]'>
			{/* Aesthetic Header */}
			<div className='bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm'>
				<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
					<div className='flex items-center justify-between py-8'>
						<div>
							<div className='flex items-center gap-3 mb-1'>
								<div className='p-2 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200'>
									<Sparkles className='h-6 w-6 text-white' />
								</div>
								<h1 className='text-4xl font-black text-gray-900 tracking-tighter'>
									Content Hub
								</h1>
							</div>
							<p className='text-sm text-gray-400 font-bold uppercase tracking-[0.2em] ml-11'>
								Piotr Romanczuk Executive Suite
							</p>
						</div>

						<div className='flex items-center gap-3'>
							<button
								onClick={handleRefresh}
								className={`p-4 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 rounded-2xl transition-all active:rotate-180 duration-500 shadow-sm ${isLoading ? 'animate-spin' : ''}`}
								title='Synchronize'
							>
								<RotateCcw className='h-5 w-5' />
							</button>
							<button
								onClick={() => setShowSubmitForm(true)}
								className='px-8 py-4 bg-gray-900 text-white rounded-3xl hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-200 transition-all active:scale-[0.98] flex items-center gap-3 font-black text-sm uppercase tracking-widest'
							>
								<Plus className='h-5 w-5' />
								Create Post
							</button>
						</div>
					</div>

					{/* Stats Dashboard */}
					{stats && isAdmin && (
						<div className='pb-10 grid grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500'>
							{[
								{
									label: 'Submissions',
									val: stats.totalSubmissions,
									icon: <TrendingUp className='h-4 w-4' />,
									color: 'blue',
								},
								{
									label: 'Pending Review',
									val: stats.pendingReview,
									icon: <Inbox className='h-4 w-4' />,
									color: 'amber',
								},
								{
									label: 'Published',
									val: stats.published,
									icon: <CheckCircle2 className='h-4 w-4' />,
									color: 'emerald',
								},
								{
									label: 'Failure Rate',
									val: stats.failed,
									icon: <AlertCircle className='h-4 w-4' />,
									color: 'rose',
								},
							].map((s) => (
								<div
									key={s.label}
									className={`group bg-white rounded-3xl p-6 border border-gray-100 hover:border-${s.color}-200 hover:shadow-xl hover:shadow-${s.color}-500/5 transition-all duration-300`}
								>
									<div className='flex items-center justify-between mb-2'>
										<div
											className={`p-2 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-${s.color}-50 group-hover:text-${s.color}-600 transition-colors`}
										>
											{s.icon}
										</div>
										<span className='text-[10px] font-black text-gray-300 uppercase tracking-widest'>
											{s.label}
										</span>
									</div>
									<div className='text-3xl font-black text-gray-900'>
										{s.val}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Main Content Area */}
			<div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-transparent'>
				{/* Modern Tab Switcher */}
				<div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12'>
					<div className='flex items-center p-1 bg-gray-100 rounded-[2rem] w-fit shadow-inner'>
						{tabs.map((t) => (
							<button
								key={t.id}
								onClick={() => setTab(t.id as any)}
								className={`px-8 py-3 rounded-[1.8rem] flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${
									tab === t.id
										? 'bg-white text-gray-900 shadow-xl'
										: 'text-gray-400 hover:text-gray-600'
								}`}
							>
								{t.icon}
								{t.label}
								{t.id === 'review' && stats?.pendingReview ? (
									<span className='ml-2 px-2 py-0.5 rounded-full bg-indigo-600 text-[10px] text-white'>
										{stats.pendingReview}
									</span>
								) : null}
							</button>
						))}
					</div>

					<div className='flex items-center gap-2 bg-gray-100 p-1 rounded-2xl w-fit shadow-inner'>
						<button
							onClick={() => setViewMode('grid')}
							className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
							title='Grid view'
						>
							<LayoutGrid className='h-4 w-4' />
						</button>
						<button
							onClick={() => setViewMode('list')}
							className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
							title='List view'
						>
							<List className='h-4 w-4' />
						</button>
					</div>
				</div>

				{/* Advanced Filters */}
				<div className='mb-12'>
					<ContentFilters
						onSearchChange={setSearch}
						onSourceChange={setSource}
						onSubmissionStatusChange={setSubmissionStatus}
						onPublishingStatusChange={setPublishingStatus}
						onSortChange={setSortBy}
						onReset={handleFiltersReset}
						isAdmin={isAdmin}
						tab={tab}
					/>
				</div>

				{/* Animated Content Grid */}
				<div className='min-h-[60vh]'>
					{!isLoading && items.length === 0 ? (
						<div className='h-[40vh] flex flex-col items-center justify-center bg-white rounded-[3rem] border border-gray-100 shadow-sm p-12 text-center animate-in fade-in zoom-in duration-500'>
							<div className='p-6 bg-gray-50 rounded-full mb-6'>
								<Inbox className='h-12 w-12 text-gray-200' />
							</div>
							<h3 className='text-2xl font-black text-gray-900 mb-2'>
								Tumbleweeds here...
							</h3>
							<p className='text-gray-400 font-medium mb-8 max-w-sm'>
								No content matches your current filters. Try adjusting them or
								create something new.
							</p>
							<button
								onClick={() => setShowSubmitForm(true)}
								className='px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:scale-110 active:scale-95 transition-all'
							>
								Create First Post
							</button>
						</div>
					) : (
						<div className='animate-in fade-in slide-in-from-bottom-8 duration-700'>
							<ContentList
								items={items}
								viewMode={viewMode}
								onPreview={handlePreview}
								onEdit={handleEdit}
								onRefresh={mutate}
								isAdmin={isAdmin}
								tab={tab}
							/>
						</div>
					)}

					{/* Luxury Pagination */}
					{pagination && pagination.total > 0 && (
						<div className='mt-20 flex flex-col sm:flex-row items-center justify-between gap-6 px-4'>
							<p className='text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]'>
								Master Catalog: Item{' '}
								{(page - 1) * (viewMode === 'list' ? 12 : 24) + 1} —{' '}
								{Math.min(
									page * (viewMode === 'list' ? 12 : 24),
									pagination.total,
								)}{' '}
								of {pagination.total}
							</p>
							<div className='flex gap-3'>
								<button
									onClick={() => setPage(Math.max(1, page - 1))}
									disabled={page === 1}
									className='h-12 px-8 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg disabled:opacity-30 disabled:grayscale transition-all font-black text-[10px] uppercase tracking-widest text-gray-600'
								>
									Previous
								</button>
								<button
									onClick={() => setPage(page + 1)}
									disabled={!pagination.hasMore}
									className='h-12 px-8 bg-gray-950 text-white rounded-2xl shadow-xl hover:bg-indigo-600 disabled:opacity-30 transition-all font-black text-[10px] uppercase tracking-widest'
								>
									Next Page
								</button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Modals with Higher Z-depth */}
			{showPreviewModal && selectedItem && (
				<ContentPreviewModal
					item={selectedItem}
					onClose={() => {
						setShowPreviewModal(false);
						setSelectedItem(null);
					}}
					onEdit={handleEdit}
					onRefresh={mutate}
					isAdmin={isAdmin}
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
