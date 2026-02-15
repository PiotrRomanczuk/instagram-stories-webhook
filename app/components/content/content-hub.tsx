'use client';

/**
 * Unified Content Hub Component
 * Consolidates meme submissions, schedule management, and admin review into one interface
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { ContentFilters } from './content-filters';
import { ContentList } from './content-list';
import { ContentPreviewModal } from './content-preview-modal';
import { ContentEditModal } from './content-edit-modal';
import { ContentSubmitForm } from './content-submit-form';
import { RescheduleOverdueModal } from './reschedule-overdue-modal';
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
	XCircle,
	Layers,
	CalendarDays,
	AlertTriangle,
	X,
	CalendarClock,
	Gauge,
	Loader2,
} from 'lucide-react';
import { ContentPublishingLimit } from '@/lib/types/instagram';
import {
	ContentItem,
	ContentSource,
	SubmissionStatus,
	PublishingStatus,
} from '@/lib/types/posts';
import type { UserRole } from '@/lib/types/posts';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Publishing Quota Indicator Component
 * Shows Instagram API rate limit usage (100 posts per 24h)
 */
function PublishingQuotaIndicator() {
	const { data, error, isLoading } = useSWR<{ limit: ContentPublishingLimit }>(
		'/api/schedule/quota',
		fetcher,
		{
			revalidateOnFocus: false,
			refreshInterval: 60000, // Refresh every minute
			dedupingInterval: 30000,
		}
	);

	if (isLoading) {
		return (
			<div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl">
				<Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
				<span className="text-xs font-bold text-gray-400">Loading quota...</span>
			</div>
		);
	}

	if (error || !data?.limit) {
		return (
			<div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-2xl" title="Unable to fetch quota">
				<Gauge className="h-4 w-4 text-amber-500" />
				<span className="text-xs font-bold text-amber-600">Quota unavailable</span>
			</div>
		);
	}

	const { limit } = data;
	const total = limit.config?.quota_total || 100;
	const used = limit.quota_usage || 0;
	const remaining = total - used;
	const usagePercent = (used / total) * 100;

	// Determine status color
	let statusColor = 'emerald';
	let bgColor = 'bg-emerald-50';
	let textColor = 'text-emerald-600';
	let barColor = 'bg-emerald-500';

	if (usagePercent >= 90) {
		statusColor = 'rose';
		bgColor = 'bg-rose-50';
		textColor = 'text-rose-600';
		barColor = 'bg-rose-500';
	} else if (usagePercent >= 70) {
		statusColor = 'amber';
		bgColor = 'bg-amber-50';
		textColor = 'text-amber-600';
		barColor = 'bg-amber-500';
	}

	return (
		<div
			className={`flex items-center gap-3 px-4 py-2 ${bgColor} rounded-2xl border border-${statusColor}-100`}
			title={`Instagram API Rate Limit: ${used}/${total} posts used in the last 24 hours`}
		>
			<Gauge className={`h-4 w-4 ${textColor}`} />
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<span className={`text-xs font-black ${textColor} uppercase tracking-wider`}>
						API Quota
					</span>
					<span className="text-[10px] font-bold text-gray-400">
						{remaining} left
					</span>
				</div>
				<div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
					<div
						className={`h-full ${barColor} rounded-full transition-all duration-500`}
						style={{ width: `${usagePercent}%` }}
					/>
				</div>
			</div>
			<span className={`text-sm font-black ${textColor}`}>
				{used}/{total}
			</span>
		</div>
	);
}

type TabType = 'all' | 'review' | 'queue' | 'published' | 'rejected';

interface ContentHubProps {
	initialTab?: TabType;
}

type ViewMode = 'grid' | 'list';
type ScheduleFilter = 'all' | 'today' | 'week' | 'overdue';

export function ContentHub({ initialTab = 'all' }: ContentHubProps) {
	const { data: session } = useSession();
	const searchParams = useSearchParams();

	// State
	const [tab, setTab] = useState<TabType>(initialTab);
	const [viewMode, setViewMode] = useState<ViewMode>('list');
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
	const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('all');
	const [page, setPage] = useState(1);
	const [showPreviewModal, setShowPreviewModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showSubmitForm, setShowSubmitForm] = useState(false);
	const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
	const [selectedIndex, setSelectedIndex] = useState<number>(0);
	const [dismissedOverdueWarning, setDismissedOverdueWarning] = useState(false);
	const [showRescheduleModal, setShowRescheduleModal] = useState(false);

	// Default sort by schedule time for queue tab
	const effectiveSortBy = tab === 'queue' && sortBy === 'newest' ? 'schedule-asc' : sortBy;

	// Build API URL with filters
	const apiParams = new URLSearchParams({
		tab,
		page: String(page),
		limit: viewMode === 'list' ? '12' : '24',
		sortBy: effectiveSortBy,
		...(search && { search }),
		...(source !== 'all' && { source }),
		...(submissionStatus !== 'all' && { submissionStatus }),
		...(publishingStatus !== 'all' && { publishingStatus }),
		...(tab === 'queue' && scheduleFilter !== 'all' && { scheduleFilter }),
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

	// Get items from response (moved up for use in handlers)
	const items: ContentItem[] = useMemo(() => data?.items || [], [data?.items]);
	const stats = data?.stats;
	const pagination = data?.pagination;

	// Handlers
	const handlePreview = useCallback((item: ContentItem) => {
		const index = items.findIndex((i: ContentItem) => i.id === item.id);
		setSelectedItem(item);
		setSelectedIndex(index >= 0 ? index : 0);
		setShowPreviewModal(true);
	}, [items]);

	const handleNavigate = useCallback((item: ContentItem, index: number) => {
		setSelectedItem(item);
		setSelectedIndex(index);
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
		{ id: 'all', label: 'All Content', icon: <Layers className='h-4 w-4' /> },
		...(isAdmin
			? [{ id: 'review', label: 'Inbox', icon: <Inbox className='h-4 w-4' />, badge: stats?.pendingReview }]
			: []),
		{ id: 'queue', label: 'Schedule', icon: <Clock className='h-4 w-4' /> },
		{
			id: 'published',
			label: 'Catalog',
			icon: <CheckCircle2 className='h-4 w-4' />,
		},
		...(isAdmin
			? [{ id: 'rejected', label: 'Rejected', icon: <XCircle className='h-4 w-4' /> }]
			: []),
	];

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
							{/* Publishing Quota - Always visible for admins */}
							{isAdmin && <PublishingQuotaIndicator />}

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

			{/* Overdue Warning Banner */}
			{isAdmin && stats?.overdueCount > 0 && !dismissedOverdueWarning && (
				<div className='bg-rose-50 border-b border-rose-100'>
					<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
						<div className='flex items-center justify-between py-4'>
							<div className='flex items-center gap-3'>
								<div className='p-2 bg-rose-100 rounded-xl'>
									<AlertTriangle className='h-5 w-5 text-rose-600' />
								</div>
								<div>
									<p className='text-sm font-bold text-rose-800'>
										{stats.overdueCount} post{stats.overdueCount !== 1 ? 's are' : ' is'} overdue
									</p>
									<p className='text-xs text-rose-600'>
										These posts missed their scheduled publish time and are waiting to be published.
									</p>
								</div>
							</div>
							<div className='flex items-center gap-3'>
								<button
									onClick={() => {
										setTab('queue');
										setScheduleFilter('overdue');
									}}
									className='px-4 py-2 bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-rose-700 transition-colors'
								>
									View Overdue
								</button>
								<button
									onClick={() => setDismissedOverdueWarning(true)}
									className='p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors'
									title='Dismiss'
								>
									<X className='h-4 w-4' />
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Main Content Area */}
			<div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-transparent'>
				{/* Modern Tab Switcher */}
				<div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8'>
					<div className='flex items-center p-1 bg-gray-100 rounded-[2rem] w-fit shadow-inner flex-wrap'>
						{tabs.map((t) => (
							<button
								key={t.id}
								onClick={() => setTab(t.id as TabType)}
								className={`px-6 py-3 rounded-[1.8rem] flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${
									tab === t.id
										? 'bg-white text-gray-900 shadow-xl'
										: 'text-gray-400 hover:text-gray-600'
								}`}
							>
								{t.icon}
								{t.label}
								{'badge' in t && t.badge ? (
									<span className='ml-1 px-2 py-0.5 rounded-full bg-rose-500 text-[10px] text-white font-black animate-pulse'>
										{t.badge}
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

				{/* Schedule Quick Filters */}
				{tab === 'queue' && (
					<div className='flex items-center justify-between gap-4 mb-8'>
						<div className='flex items-center gap-2'>
							<CalendarDays className='h-4 w-4 text-gray-400' />
							<span className='text-xs font-bold text-gray-400 uppercase tracking-wider mr-2'>Show:</span>
							{[
								{ id: 'all', label: 'All Scheduled' },
								{ id: 'today', label: 'Today' },
								{ id: 'week', label: 'This Week' },
								{ id: 'overdue', label: 'Overdue', color: 'rose' },
							].map((filter) => (
								<button
									key={filter.id}
									onClick={() => setScheduleFilter(filter.id as ScheduleFilter)}
									className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
										scheduleFilter === filter.id
											? filter.id === 'overdue'
												? 'bg-rose-500 text-white shadow-lg'
												: 'bg-indigo-600 text-white shadow-lg'
											: filter.id === 'overdue' && stats?.overdueCount
												? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
												: 'bg-gray-100 text-gray-500 hover:bg-gray-200'
									}`}
								>
									{filter.label}
									{filter.id === 'overdue' && stats?.overdueCount ? (
										<span className='ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black'>
											{stats.overdueCount}
										</span>
									) : null}
								</button>
							))}
						</div>

						{/* Reschedule All Overdue Button */}
						{isAdmin && scheduleFilter === 'overdue' && stats?.overdueCount > 0 && (
							<button
								onClick={() => setShowRescheduleModal(true)}
								className='px-4 py-2 bg-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-2 shadow-lg'
							>
								<CalendarClock className='h-4 w-4' />
								Reschedule All
							</button>
						)}
					</div>
				)}

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
						currentSearch={search}
						currentSource={source}
						currentSubmissionStatus={submissionStatus}
						currentPublishingStatus={publishingStatus}
						currentSortBy={sortBy}
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
					items={items}
					currentIndex={selectedIndex}
					onNavigate={handleNavigate}
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

			{/* Reschedule Overdue Modal */}
			{showRescheduleModal && (
				<RescheduleOverdueModal
					onClose={() => setShowRescheduleModal(false)}
					onSuccess={mutate}
					overdueCount={stats?.overdueCount || 0}
				/>
			)}
		</div>
	);
}
