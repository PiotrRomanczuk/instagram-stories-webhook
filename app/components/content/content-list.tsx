'use client';

/**
 * Unified Content List Component
 * Displays content in grid or list view modes
 * List view includes drag handles when on queue tab
 * Quick actions for approve/reject directly in row
 * Bulk selection with floating action bar
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ContentItem } from '@/lib/types/posts';
import { ContentCard } from './content-card';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { MediaThumbnail } from '../ui/media-thumbnail';
import {
	GripVertical,
	Calendar,
	Send,
	Eye,
	Clock,
	ThumbsUp,
	ThumbsDown,
	Loader2,
	X,
	CheckSquare,
	Square,
	MinusSquare,
	AlertTriangle,
	Info,
	RefreshCw,
	BarChart3,
	Users,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	ImageOff,
} from 'lucide-react';
import { MediaInsight } from '@/lib/types/instagram';

/**
 * Format creator name - handles UUID fallback gracefully
 */
function formatCreatorName(userEmail?: string): string {
	if (!userEmail) return 'Unknown';

	// Check if it looks like a UUID (incorrectly stored user_id)
	const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (uuidPattern.test(userEmail)) {
		return 'Unknown';
	}

	// Extract username from email or return as-is if no @
	return userEmail.split('@')[0] || 'Unknown';
}

/**
 * Story Preview on Hover Component
 */
function StoryPreviewHover({ item }: { item: ContentItem }) {
	const [imageError, setImageError] = useState(false);
	const hasValidUrl = item.mediaUrl && !item.mediaUrl.startsWith('blob:');

	if (!hasValidUrl || imageError) {
		return null; // Don't show preview for invalid images
	}

	return (
		<div className='absolute left-full ml-4 top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover/media:opacity-100 pointer-events-none transition-opacity duration-200'>
			<div className='relative w-[180px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-gray-900'>
				{/* Blurred Background */}
				<img
					src={item.mediaUrl}
					alt=''
					className='absolute inset-0 h-full w-full object-cover blur-2xl opacity-60 scale-125'
					onError={() => setImageError(true)}
				/>
				{/* Main Media */}
				<img
					src={item.mediaUrl}
					alt='Story Preview'
					className='relative z-10 h-full w-full object-contain drop-shadow-lg'
					onError={() => setImageError(true)}
				/>
				{/* Story UI Overlay */}
				<div className='absolute inset-0 z-20 p-3 flex flex-col justify-between pointer-events-none'>
					<div className='space-y-2'>
						<div className='flex gap-1 h-0.5'>
							<div className='flex-1 bg-white/60 rounded-full' />
							<div className='flex-1 bg-white/20 rounded-full' />
						</div>
						<div className='flex items-center gap-2'>
							<div className='w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5'>
								<div className='w-full h-full rounded-full bg-black flex items-center justify-center text-[6px] font-black text-white'>
									IG
								</div>
							</div>
							<span className='text-[8px] font-bold text-white drop-shadow'>
								Story Preview
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Quick Insights Display for List View
 */
function QuickInsights({ contentId }: { contentId: string }) {
	const [insights, setInsights] = useState<MediaInsight[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchInsights = async () => {
			try {
				const response = await fetch(`/api/content/${contentId}/insights`);
				const data = await response.json();

				if (!response.ok) {
					setError(data.message || 'Unavailable');
					return;
				}

				setInsights(data.insights || []);
			} catch {
				setError('Failed');
			} finally {
				setIsLoading(false);
			}
		};

		fetchInsights();
	}, [contentId]);

	if (isLoading) {
		return (
			<div className='flex items-center gap-1 text-gray-400'>
				<Loader2 className='h-3 w-3 animate-spin' />
			</div>
		);
	}

	if (error) {
		return (
			<span className='text-[10px] text-gray-400' title={error}>
				-
			</span>
		);
	}

	// Extract key metrics
	const impressions = insights.find((i) => i.name === 'impressions')?.values?.[0]?.value ?? 0;
	const reach = insights.find((i) => i.name === 'reach')?.values?.[0]?.value ?? 0;

	if (impressions === 0 && reach === 0) {
		return <span className='text-[10px] text-gray-400'>No data</span>;
	}

	return (
		<div className='flex items-center gap-3'>
			<div className='flex items-center gap-1' title='Impressions'>
				<Eye className='h-3 w-3 text-indigo-500' />
				<span className='text-xs font-bold text-gray-700'>
					{impressions.toLocaleString()}
				</span>
			</div>
			<div className='flex items-center gap-1' title='Reach'>
				<Users className='h-3 w-3 text-emerald-500' />
				<span className='text-xs font-bold text-gray-700'>
					{reach.toLocaleString()}
				</span>
			</div>
		</div>
	);
}

/**
 * Format overdue duration in human-readable form
 */
function formatOverdueDuration(scheduledTime: number): string {
	const now = Date.now();
	const diffMs = now - scheduledTime;
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffHours / 24);

	if (diffDays > 0) {
		return `${diffDays}d`;
	}
	if (diffHours > 0) {
		return `${diffHours}h`;
	}
	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	return `${diffMinutes}m`;
}

/**
 * Enhanced Status Badge with Error Details
 */
function StatusBadge({ item }: { item: ContentItem }) {
	const [showDetails, setShowDetails] = useState(false);
	const [now] = useState(() => Date.now());

	const hasError = item.publishingStatus === 'failed' || item.error;
	const hasRejection = item.submissionStatus === 'rejected' && item.rejectionReason;
	const hasRetries = item.retryCount && item.retryCount > 0;

	// Check if post is overdue (scheduled but past due time)
	const isOverdue =
		item.publishingStatus === 'scheduled' &&
		item.scheduledTime &&
		item.scheduledTime < now;

	const statusColors: Record<string, string> = {
		published: 'bg-emerald-100 text-emerald-700',
		scheduled: 'bg-amber-100 text-amber-700',
		processing: 'bg-blue-100 text-blue-700',
		failed: 'bg-rose-100 text-rose-700',
		draft: 'bg-gray-100 text-gray-600',
	};

	const submissionColors: Record<string, string> = {
		pending: 'bg-orange-100 text-orange-600',
		approved: 'bg-emerald-50 text-emerald-600',
		rejected: 'bg-rose-50 text-rose-600',
	};

	return (
		<div className='flex flex-col gap-1 relative'>
			{/* Main Status Badge */}
			<div className='flex items-center gap-1.5'>
				<span
					className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest w-fit ${
						statusColors[item.publishingStatus] || 'bg-gray-100 text-gray-600'
					}`}
				>
					{item.publishingStatus}
				</span>

				{/* Overdue badge */}
				{isOverdue && (
					<span className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse'>
						<Clock className='h-3 w-3' />
						OVERDUE {formatOverdueDuration(item.scheduledTime!)}
					</span>
				)}

				{/* Error/Info indicator */}
				{(hasError || hasRejection) && (
					<button
						onClick={() => setShowDetails(!showDetails)}
						className={`p-1 rounded-full transition-colors ${
							hasError
								? 'text-rose-500 hover:bg-rose-50'
								: 'text-amber-500 hover:bg-amber-50'
						}`}
						title='View details'
					>
						{hasError ? (
							<AlertTriangle className='h-3.5 w-3.5' />
						) : (
							<Info className='h-3.5 w-3.5' />
						)}
					</button>
				)}

				{/* Retry indicator */}
				{hasRetries && (
					<span
						className='inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded text-[9px] font-bold'
						title={`${item.retryCount} retry attempt(s)`}
					>
						<RefreshCw className='h-2.5 w-2.5' />
						{item.retryCount}
					</span>
				)}
			</div>

			{/* Submission Status (for submissions) */}
			{item.source === 'submission' && item.submissionStatus && (
				<span
					className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase w-fit ${
						submissionColors[item.submissionStatus] || 'bg-gray-50 text-gray-500'
					}`}
				>
					{item.submissionStatus}
				</span>
			)}

			{/* Error/Details Popover */}
			{showDetails && (hasError || hasRejection) && (
				<div className='absolute left-0 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-72 animate-in fade-in zoom-in-95 duration-150'>
					<button
						onClick={() => setShowDetails(false)}
						className='absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded'
					>
						<X className='h-3.5 w-3.5' />
					</button>

					{hasError && (
						<div className='mb-3'>
							<div className='flex items-center gap-2 mb-2'>
								<AlertTriangle className='h-4 w-4 text-rose-500' />
								<span className='text-xs font-black text-rose-700 uppercase tracking-wider'>
									Error Details
								</span>
							</div>
							<p className='text-xs text-gray-700 bg-rose-50 rounded-lg p-3 font-mono break-words'>
								{item.error || 'Publishing failed'}
							</p>
						</div>
					)}

					{hasRejection && (
						<div>
							<div className='flex items-center gap-2 mb-2'>
								<Info className='h-4 w-4 text-amber-500' />
								<span className='text-xs font-black text-amber-700 uppercase tracking-wider'>
									Rejection Reason
								</span>
							</div>
							<p className='text-xs text-gray-700 bg-amber-50 rounded-lg p-3'>
								{item.rejectionReason}
							</p>
						</div>
					)}

					{item.publishedAt && (
						<div className='mt-3 pt-3 border-t border-gray-100'>
							<p className='text-[10px] text-gray-400'>
								Published: {new Date(item.publishedAt).toLocaleString()}
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

/**
 * Quick Reject Popover Component
 */
function QuickRejectPopover({
	isOpen,
	onClose,
	onReject,
	isLoading,
}: {
	isOpen: boolean;
	onClose: () => void;
	onReject: (reason: string) => void;
	isLoading: boolean;
}) {
	const [reason, setReason] = useState('');

	if (!isOpen) return null;

	return (
		<div className='absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 w-64'>
			<div className='flex items-center justify-between mb-2'>
				<span className='text-xs font-bold text-gray-700'>Rejection Reason</span>
				<button onClick={onClose} className='text-gray-400 hover:text-gray-600'>
					<X className='h-4 w-4' />
				</button>
			</div>
			<textarea
				value={reason}
				onChange={(e) => setReason(e.target.value)}
				placeholder='Why reject this?'
				className='w-full p-2 text-xs border border-gray-200 rounded-lg resize-none h-16 focus:outline-none focus:ring-2 focus:ring-rose-200'
				autoFocus
			/>
			<button
				onClick={() => {
					if (reason.trim()) {
						onReject(reason);
						setReason('');
					}
				}}
				disabled={!reason.trim() || isLoading}
				className='mt-2 w-full px-3 py-2 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2'
			>
				{isLoading && <Loader2 className='h-3 w-3 animate-spin' />}
				Reject
			</button>
		</div>
	);
}

type ViewMode = 'grid' | 'list';

type SortColumn = 'creator' | 'status' | 'scheduled';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
	column: SortColumn | null;
	direction: SortDirection;
}

/**
 * Sortable Column Header Component
 */
function SortableHeader({
	label,
	column,
	currentSort,
	onSort,
	children,
}: {
	label: string;
	column: SortColumn;
	currentSort: SortConfig;
	onSort: (column: SortColumn) => void;
	children?: React.ReactNode;
}) {
	const isActive = currentSort.column === column;

	return (
		<th className='px-6 py-5 text-left'>
			<button
				onClick={() => onSort(column)}
				className='flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-colors group'
			>
				{children}
				{label}
				<span className='ml-0.5'>
					{isActive ? (
						currentSort.direction === 'asc' ? (
							<ArrowUp className='h-3 w-3 text-indigo-500' />
						) : (
							<ArrowDown className='h-3 w-3 text-indigo-500' />
						)
					) : (
						<ArrowUpDown className='h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity' />
					)}
				</span>
			</button>
		</th>
	);
}

interface ContentListProps {
	items: ContentItem[];
	viewMode: ViewMode;
	onPreview: (item: ContentItem) => void;
	onEdit: (item: ContentItem) => void;
	onRefresh: () => void;
	isAdmin: boolean;
	tab: 'all' | 'review' | 'queue' | 'published' | 'rejected';
}

export function ContentList({
	items,
	viewMode,
	onPreview,
	onEdit,
	onRefresh,
	isAdmin,
	tab,
}: ContentListProps) {
	const [selectedItemForPublish, setSelectedItemForPublish] =
		useState<ContentItem | null>(null);
	const [isPublishing, setIsPublishing] = useState(false);
	const [approvingId, setApprovingId] = useState<string | null>(null);
	const [rejectingId, setRejectingId] = useState<string | null>(null);
	const [showRejectPopover, setShowRejectPopover] = useState<string | null>(null);

	// Bulk selection state
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [isBulkProcessing, setIsBulkProcessing] = useState(false);
	const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
	const [bulkRejectReason, setBulkRejectReason] = useState('');

	// Sorting state
	const [sortConfig, setSortConfig] = useState<SortConfig>({
		column: null,
		direction: 'asc',
	});

	const handleSort = (column: SortColumn) => {
		setSortConfig((prev) => ({
			column,
			direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
		}));
	};

	// Sorted items
	const sortedItems = useMemo(() => {
		if (!sortConfig.column) return items;

		const sorted = [...items].sort((a, b) => {
			let comparison = 0;

			switch (sortConfig.column) {
				case 'creator': {
					const creatorA = formatCreatorName(a.userEmail).toLowerCase();
					const creatorB = formatCreatorName(b.userEmail).toLowerCase();
					comparison = creatorA.localeCompare(creatorB);
					break;
				}
				case 'status': {
					const statusOrder = ['published', 'scheduled', 'processing', 'draft', 'failed'];
					const indexA = statusOrder.indexOf(a.publishingStatus);
					const indexB = statusOrder.indexOf(b.publishingStatus);
					comparison = indexA - indexB;
					break;
				}
				case 'scheduled': {
					const timeA = a.scheduledTime ?? 0;
					const timeB = b.scheduledTime ?? 0;
					comparison = timeA - timeB;
					break;
				}
			}

			return sortConfig.direction === 'asc' ? comparison : -comparison;
		});

		return sorted;
	}, [items, sortConfig]);

	// Get selectable items (pending submissions for bulk approve/reject)
	const selectableItems = useMemo(
		() => items.filter((item) => item.source === 'submission' && item.submissionStatus === 'pending'),
		[items]
	);

	const allSelectableSelected =
		selectableItems.length > 0 && selectableItems.every((item) => selectedIds.has(item.id));
	const someSelectableSelected =
		selectableItems.some((item) => selectedIds.has(item.id)) && !allSelectableSelected;

	const toggleSelect = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const toggleSelectAll = () => {
		if (allSelectableSelected) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(selectableItems.map((item) => item.id)));
		}
	};

	const clearSelection = () => {
		setSelectedIds(new Set());
	};

	// Bulk approve handler
	const handleBulkApprove = async () => {
		if (selectedIds.size === 0) return;
		setIsBulkProcessing(true);
		try {
			const promises = Array.from(selectedIds).map((id) =>
				fetch(`/api/content/${id}/review`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ action: 'approve' }),
				})
			);
			await Promise.all(promises);
			clearSelection();
			onRefresh();
		} catch (err) {
			console.error('Bulk approve failed', err);
		} finally {
			setIsBulkProcessing(false);
		}
	};

	// Bulk reject handler
	const handleBulkReject = async () => {
		if (selectedIds.size === 0 || !bulkRejectReason.trim()) return;
		setIsBulkProcessing(true);
		try {
			const promises = Array.from(selectedIds).map((id) =>
				fetch(`/api/content/${id}/review`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ action: 'reject', rejectionReason: bulkRejectReason }),
				})
			);
			await Promise.all(promises);
			clearSelection();
			setShowBulkRejectDialog(false);
			setBulkRejectReason('');
			onRefresh();
		} catch (err) {
			console.error('Bulk reject failed', err);
		} finally {
			setIsBulkProcessing(false);
		}
	};

	const handlePublishNow = async () => {
		if (!selectedItemForPublish) return;
		try {
			setIsPublishing(true);
			const response = await fetch(
				`/api/content/${selectedItemForPublish.id}/publish`,
				{
					method: 'POST',
				},
			);
			if (response.ok) {
				onRefresh();
				setSelectedItemForPublish(null);
			} else {
				const data = await response.json();
				console.error('Publish failed:', data.error);
			}
		} catch (err) {
			console.error('Failed to publish now', err);
		} finally {
			setIsPublishing(false);
		}
	};

	const handleQuickApprove = async (itemId: string) => {
		try {
			setApprovingId(itemId);
			const response = await fetch(`/api/content/${itemId}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'approve' }),
			});
			if (response.ok) {
				onRefresh();
			}
		} catch (err) {
			console.error('Failed to approve', err);
		} finally {
			setApprovingId(null);
		}
	};

	const handleQuickReject = async (itemId: string, reason: string) => {
		try {
			setRejectingId(itemId);
			const response = await fetch(`/api/content/${itemId}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
			});
			if (response.ok) {
				onRefresh();
				setShowRejectPopover(null);
			}
		} catch (err) {
			console.error('Failed to reject', err);
		} finally {
			setRejectingId(null);
		}
	};

	const isQueueTab = tab === 'queue';
	const isPendingSubmission = (item: ContentItem) =>
		item.source === 'submission' && item.submissionStatus === 'pending';

	if (viewMode === 'grid') {
		return (
			<div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
				{items.map((item) => (
					<ContentCard
						key={item.id}
						item={item}
						onPreview={() => onPreview(item)}
						onEdit={() => onEdit(item)}
						onRefresh={onRefresh}
						isAdmin={isAdmin}
						tab={tab}
					/>
				))}
			</div>
		);
	}

	const showBulkSelection = isAdmin && selectableItems.length > 0;

	// List view (with drag handles when on queue tab)
	return (
		<div className='bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden relative'>
			{/* Floating Bulk Actions Bar */}
			{selectedIds.size > 0 && (
				<div className='sticky top-0 z-20 bg-indigo-600 text-white px-6 py-4 flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 duration-200'>
					<div className='flex items-center gap-4'>
						<button
							onClick={clearSelection}
							className='p-1.5 hover:bg-white/20 rounded-lg transition-colors'
							title='Clear selection'
						>
							<X className='h-4 w-4' />
						</button>
						<span className='text-sm font-bold'>
							{selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
						</span>
					</div>
					<div className='flex items-center gap-3'>
						<button
							onClick={handleBulkApprove}
							disabled={isBulkProcessing}
							className='px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50'
						>
							{isBulkProcessing ? (
								<Loader2 className='h-4 w-4 animate-spin' />
							) : (
								<ThumbsUp className='h-4 w-4' />
							)}
							Approve All
						</button>
						<button
							onClick={() => setShowBulkRejectDialog(true)}
							disabled={isBulkProcessing}
							className='px-4 py-2 bg-rose-500 hover:bg-rose-400 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50'
						>
							<ThumbsDown className='h-4 w-4' />
							Reject All
						</button>
					</div>
				</div>
			)}

			{isQueueTab && (
				<div className='p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3'>
					<Clock className='h-5 w-5 text-indigo-600' />
					<p className='text-sm font-bold text-indigo-900 leading-none'>
						Queue:{' '}
						<span className='font-medium text-indigo-700/70 ml-1'>
							Drag items to reorder publishing sequence.
						</span>
					</p>
				</div>
			)}
			<div className='overflow-x-auto'>
				<table className='w-full text-sm'>
					<thead>
						<tr className='bg-gray-50/50 border-b border-gray-100'>
							{showBulkSelection && (
								<th className='w-12 px-4 py-5'>
									<button
										onClick={toggleSelectAll}
										className='p-1 hover:bg-gray-100 rounded transition-colors'
										title={allSelectableSelected ? 'Deselect all' : 'Select all pending'}
									>
										{allSelectableSelected ? (
											<CheckSquare className='h-5 w-5 text-indigo-600' />
										) : someSelectableSelected ? (
											<MinusSquare className='h-5 w-5 text-indigo-400' />
										) : (
											<Square className='h-5 w-5 text-gray-300' />
										)}
									</button>
								</th>
							)}
							{isQueueTab && <th className='w-12 px-2 py-5'></th>}
							<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
								Media
							</th>
							<SortableHeader
								label='Creator'
								column='creator'
								currentSort={sortConfig}
								onSort={handleSort}
							/>
							<SortableHeader
								label='Status'
								column='status'
								currentSort={sortConfig}
								onSort={handleSort}
							/>
							<SortableHeader
								label='Scheduled'
								column='scheduled'
								currentSort={sortConfig}
								onSort={handleSort}
							/>
							{tab === 'published' && (
								<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
									<div className='flex items-center gap-1'>
										<BarChart3 className='h-3 w-3' />
										Insights
									</div>
								</th>
							)}
							<th className='px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
								Actions
							</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-gray-50'>
						{sortedItems.map((item) => (
							<tr
								key={item.id}
								className={`group hover:bg-indigo-50/30 transition-colors ${
									isPendingSubmission(item) ? 'bg-amber-50/30' : ''
								} ${selectedIds.has(item.id) ? 'bg-indigo-50' : ''}`}
							>
								{showBulkSelection && (
									<td className='px-4 py-5'>
										{isPendingSubmission(item) ? (
											<button
												onClick={() => toggleSelect(item.id)}
												className='p-1 hover:bg-gray-100 rounded transition-colors'
											>
												{selectedIds.has(item.id) ? (
													<CheckSquare className='h-5 w-5 text-indigo-600' />
												) : (
													<Square className='h-5 w-5 text-gray-300 group-hover:text-gray-400' />
												)}
											</button>
										) : (
											<div className='w-7' /> // Spacer for non-selectable items
										)}
									</td>
								)}
								{isQueueTab && (
									<td className='px-2 py-5'>
										<div className='cursor-grab active:cursor-grabbing p-2 text-gray-300 group-hover:text-indigo-400'>
											<GripVertical className='h-5 w-5' />
										</div>
									</td>
								)}
								<td className='px-6 py-5'>
									<div className='relative group/media'>
										<MediaThumbnail
											src={item.mediaUrl}
											size="sm"
											className="ring-2 ring-transparent group-hover/media:ring-indigo-400 transition-all cursor-pointer rounded-xl"
										/>
										<StoryPreviewHover item={item} />
									</div>
								</td>
								<td className='px-6 py-5'>
									<p className='text-xs font-bold text-gray-700'>
										{formatCreatorName(item.userEmail)}
									</p>
								</td>
								<td className='px-6 py-5'>
									<StatusBadge item={item} />
								</td>
								<td className='px-6 py-5'>
									{item.scheduledTime ? (
										<div className='flex items-center gap-2'>
											<Calendar className='h-3 w-3 text-amber-500' />
											<span className='text-xs font-bold text-amber-600'>
												{new Date(item.scheduledTime).toLocaleString([], {
													dateStyle: 'short',
													timeStyle: 'short',
												})}
											</span>
										</div>
									) : (
										<span className='text-xs text-gray-400'>Not scheduled</span>
									)}
								</td>
								{tab === 'published' && (
									<td className='px-6 py-5'>
										{item.publishingStatus === 'published' && item.igMediaId ? (
											<QuickInsights contentId={item.id} />
										) : (
											<span className='text-xs text-gray-400'>-</span>
										)}
									</td>
								)}
								<td className='px-6 py-5 text-right'>
									<div className='flex justify-end gap-1 relative'>
										{/* Quick Approve/Reject for pending submissions */}
										{isAdmin && isPendingSubmission(item) && (
											<>
												<button
													onClick={() => handleQuickApprove(item.id)}
													disabled={approvingId === item.id}
													className='p-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-emerald-600 hover:text-emerald-700 border border-emerald-200'
													title='Approve'
												>
													{approvingId === item.id ? (
														<Loader2 className='h-4 w-4 animate-spin' />
													) : (
														<ThumbsUp className='h-4 w-4' />
													)}
												</button>
												<button
													onClick={() => setShowRejectPopover(item.id)}
													className='p-2 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors text-rose-600 hover:text-rose-700 border border-rose-200'
													title='Reject'
												>
													<ThumbsDown className='h-4 w-4' />
												</button>
												<QuickRejectPopover
													isOpen={showRejectPopover === item.id}
													onClose={() => setShowRejectPopover(null)}
													onReject={(reason) => handleQuickReject(item.id, reason)}
													isLoading={rejectingId === item.id}
												/>
											</>
										)}

										{/* Standard actions */}
										<button
											onClick={() => onPreview(item)}
											className='p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-indigo-600 shadow-sm border border-transparent hover:border-indigo-100'
											title='Preview'
										>
											<Eye className='h-4 w-4' />
										</button>
										{isAdmin && item.publishingStatus !== 'published' && (
											<>
												<button
													onClick={() => onEdit(item)}
													className='p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-amber-600 shadow-sm border border-transparent hover:border-amber-100'
													title='Schedule'
												>
													<Calendar className='h-4 w-4' />
												</button>
												{/* MVP: Instant publish hidden — scheduling only */}
											</>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<ConfirmationDialog
				isOpen={!!selectedItemForPublish}
				onClose={() => setSelectedItemForPublish(null)}
				onConfirm={handlePublishNow}
				title='Publish Content?'
				message={`This will immediately publish "${selectedItemForPublish?.title || 'this post'}" to Instagram. Let's go live!`}
				confirmLabel='Publish Now'
				type='success'
				isLoading={isPublishing}
			/>

			{/* Bulk Reject Dialog */}
			{showBulkRejectDialog && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200'>
					<div className='bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200'>
						<h3 className='text-xl font-black text-gray-900 mb-2'>
							Reject {selectedIds.size} Item{selectedIds.size !== 1 ? 's' : ''}?
						</h3>
						<p className='text-sm text-gray-500 mb-6'>
							Please provide a reason for rejecting these submissions.
						</p>
						<textarea
							value={bulkRejectReason}
							onChange={(e) => setBulkRejectReason(e.target.value)}
							placeholder='Rejection reason...'
							className='w-full p-4 border border-gray-200 rounded-2xl resize-none h-32 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 text-sm'
							autoFocus
						/>
						<div className='flex gap-3 mt-6'>
							<button
								onClick={() => {
									setShowBulkRejectDialog(false);
									setBulkRejectReason('');
								}}
								className='flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors'
							>
								Cancel
							</button>
							<button
								onClick={handleBulkReject}
								disabled={!bulkRejectReason.trim() || isBulkProcessing}
								className='flex-1 px-6 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
							>
								{isBulkProcessing && <Loader2 className='h-4 w-4 animate-spin' />}
								Reject All
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
