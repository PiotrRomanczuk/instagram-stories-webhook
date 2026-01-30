'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ContentItem } from '@/lib/types/posts';
import { MediaInsight } from '@/lib/types/instagram';
import {
	X,
	Share2,
	Eye,
	Info,
	Clock,
	CheckCircle2,
	AlertCircle,
	CalendarClock,
	Send,
	Globe,
	ThumbsUp,
	ThumbsDown,
	Loader2,
	ChevronLeft,
	ChevronRight,
	BarChart3,
	Users,
	MousePointerClick,
	RefreshCw,
	TrendingUp,
	ArrowRight,
	ArrowLeft,
	LogOut,
	MessageCircle,
	Trash2,
} from 'lucide-react';
import { ConfirmationDialog } from '../ui/confirmation-dialog';

/**
 * Format creator name - handles UUID fallback gracefully
 */
function formatCreatorName(userEmail?: string): string {
	if (!userEmail) return 'Unknown';
	const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (uuidPattern.test(userEmail)) return 'Unknown';
	return userEmail.split('@')[0] || 'Unknown';
}

/**
 * Map insight names to display labels and icons
 */
const INSIGHT_CONFIG: Record<
	string,
	{ label: string; icon: React.ElementType; description: string }
> = {
	impressions: {
		label: 'Impressions',
		icon: Eye,
		description: 'Total number of times the story was seen',
	},
	reach: {
		label: 'Reach',
		icon: Users,
		description: 'Number of unique accounts that saw the story',
	},
	replies: {
		label: 'Replies',
		icon: MessageCircle,
		description: 'Number of replies to the story',
	},
	taps_forward: {
		label: 'Taps Forward',
		icon: ArrowRight,
		description: 'Number of taps to see the next story',
	},
	taps_back: {
		label: 'Taps Back',
		icon: ArrowLeft,
		description: 'Number of taps to see the previous story',
	},
	exits: {
		label: 'Exits',
		icon: LogOut,
		description: 'Number of times someone exited the story',
	},
};

/**
 * Insights Panel Component for published posts
 */
function InsightsPanel({ contentId }: { contentId: string }) {
	const [insights, setInsights] = useState<MediaInsight[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchInsights = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const response = await fetch(`/api/content/${contentId}/insights`);
			const data = await response.json();

			if (!response.ok) {
				setError(data.message || data.error || 'Failed to load insights');
				return;
			}

			setInsights(data.insights || []);
		} catch (err) {
			setError('Failed to fetch insights');
			console.error('Insights fetch error:', err);
		} finally {
			setIsLoading(false);
		}
	}, [contentId]);

	useEffect(() => {
		fetchInsights();
	}, [fetchInsights]);

	if (isLoading) {
		return (
			<section className='space-y-4'>
				<div className='flex items-center justify-between'>
					<h3 className='text-xs font-black text-gray-400 uppercase tracking-[0.2em]'>
						Performance
					</h3>
					<BarChart3 className='h-4 w-4 text-gray-200' />
				</div>
				<div className='flex items-center justify-center py-8'>
					<Loader2 className='h-6 w-6 text-indigo-400 animate-spin' />
				</div>
			</section>
		);
	}

	if (error) {
		return (
			<section className='space-y-4'>
				<div className='flex items-center justify-between'>
					<h3 className='text-xs font-black text-gray-400 uppercase tracking-[0.2em]'>
						Performance
					</h3>
					<button
						onClick={fetchInsights}
						className='p-1 hover:bg-gray-100 rounded transition-colors'
						title='Retry'
					>
						<RefreshCw className='h-4 w-4 text-gray-400 hover:text-gray-600' />
					</button>
				</div>
				<div className='p-4 bg-amber-50 rounded-2xl border border-amber-100'>
					<p className='text-xs text-amber-700'>{error}</p>
				</div>
			</section>
		);
	}

	if (insights.length === 0) {
		return (
			<section className='space-y-4'>
				<div className='flex items-center justify-between'>
					<h3 className='text-xs font-black text-gray-400 uppercase tracking-[0.2em]'>
						Performance
					</h3>
					<BarChart3 className='h-4 w-4 text-gray-200' />
				</div>
				<div className='p-4 bg-gray-50 rounded-2xl'>
					<p className='text-xs text-gray-500'>No insights available yet.</p>
				</div>
			</section>
		);
	}

	return (
		<section className='space-y-4'>
			<div className='flex items-center justify-between'>
				<h3 className='text-xs font-black text-gray-400 uppercase tracking-[0.2em]'>
					Performance
				</h3>
				<button
					onClick={fetchInsights}
					className='p-1 hover:bg-gray-100 rounded transition-colors'
					title='Refresh insights'
				>
					<RefreshCw className='h-4 w-4 text-gray-400 hover:text-gray-600' />
				</button>
			</div>
			<div className='grid grid-cols-2 gap-3'>
				{insights.map((insight) => {
					const config = INSIGHT_CONFIG[insight.name];
					const Icon = config?.icon || TrendingUp;
					const value = insight.values?.[0]?.value ?? 0;

					return (
						<div
							key={insight.name}
							className='p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100/50 group hover:shadow-md transition-all'
							title={config?.description || insight.description}
						>
							<div className='flex items-center gap-2 mb-2'>
								<Icon className='h-4 w-4 text-indigo-500' />
								<span className='text-[10px] font-bold text-indigo-600 uppercase tracking-wider'>
									{config?.label || insight.name.replace(/_/g, ' ')}
								</span>
							</div>
							<p className='text-2xl font-black text-gray-900'>
								{value.toLocaleString()}
							</p>
						</div>
					);
				})}
			</div>
		</section>
	);
}

interface ContentPreviewModalProps {
	item: ContentItem;
	onClose: () => void;
	onEdit: (item: ContentItem) => void;
	onRefresh: () => void;
	isAdmin?: boolean;
	// Navigation props for streamlined review
	items?: ContentItem[];
	currentIndex?: number;
	onNavigate?: (item: ContentItem, index: number) => void;
}

export function ContentPreviewModal({
	item,
	onClose,
	onEdit,
	onRefresh,
	isAdmin = false,
	items,
	currentIndex,
	onNavigate,
}: ContentPreviewModalProps) {
	const [showStoryFrame, setShowStoryFrame] = useState(false);
	const [showConfirmPublish, setShowConfirmPublish] = useState(false);
	const [showConfirmDelete, setShowConfirmDelete] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isReviewing, setIsReviewing] = useState(false);
	const [showRejectDialog, setShowRejectDialog] = useState(false);
	const [rejectionReason, setRejectionReason] = useState('');

	// Navigation helpers
	const hasNavigation = items && items.length > 1 && currentIndex !== undefined && onNavigate;
	const canGoPrevious = hasNavigation && currentIndex > 0;
	const canGoNext = hasNavigation && currentIndex < items.length - 1;

	const goToPrevious = useCallback(() => {
		if (canGoPrevious && items && onNavigate) {
			onNavigate(items[currentIndex - 1], currentIndex - 1);
		}
	}, [canGoPrevious, items, currentIndex, onNavigate]);

	const goToNext = useCallback(() => {
		if (canGoNext && items && onNavigate) {
			onNavigate(items[currentIndex + 1], currentIndex + 1);
		}
	}, [canGoNext, items, currentIndex, onNavigate]);

	// Keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't handle if typing in an input
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			switch (e.key) {
				case 'Escape':
					if (showRejectDialog) {
						setShowRejectDialog(false);
					} else if (showConfirmPublish) {
						setShowConfirmPublish(false);
					} else {
						onClose();
					}
					break;
				case 'ArrowLeft':
					e.preventDefault();
					goToPrevious();
					break;
				case 'ArrowRight':
					e.preventDefault();
					goToNext();
					break;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onClose, goToPrevious, goToNext, showRejectDialog, showConfirmPublish]);

	const handlePublishNow = async () => {
		try {
			setIsPublishing(true);
			const response = await fetch(`/api/content/${item.id}/publish`, {
				method: 'POST',
			});
			if (response.ok) {
				onRefresh();
				onClose();
			}
		} catch (err) {
			console.error('Failed to publish now', err);
		} finally {
			setIsPublishing(false);
		}
	};

	const handleApprove = async () => {
		try {
			setIsReviewing(true);
			const response = await fetch(`/api/content/${item.id}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'approve' }),
			});
			if (response.ok) {
				onRefresh();
				onClose();
			}
		} catch (err) {
			console.error('Failed to approve', err);
		} finally {
			setIsReviewing(false);
		}
	};

	const handleReject = async () => {
		if (!rejectionReason.trim()) return;
		try {
			setIsReviewing(true);
			const response = await fetch(`/api/content/${item.id}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'reject', rejectionReason }),
			});
			if (response.ok) {
				onRefresh();
				onClose();
			}
		} catch (err) {
			console.error('Failed to reject', err);
		} finally {
			setIsReviewing(false);
			setShowRejectDialog(false);
		}
	};

	const handleDelete = async () => {
		try {
			setIsDeleting(true);
			const response = await fetch(`/api/memes/${item.id}`, {
				method: 'DELETE',
			});
			if (response.ok) {
				onRefresh();
				onClose();
			}
		} catch (err) {
			console.error('Failed to delete', err);
		} finally {
			setIsDeleting(false);
			setShowConfirmDelete(false);
		}
	};

	const isPendingSubmission =
		item.source === 'submission' && item.submissionStatus === 'pending';

	return (
		<>
			<div
				className='fixed inset-0 z-[80] bg-black/70 backdrop-blur-md transition-all'
				onClick={onClose}
			/>
			<div className='fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6'>
				{/* Navigation Arrows */}
				{hasNavigation && (
					<>
						{/* Previous Button */}
						<button
							onClick={goToPrevious}
							disabled={!canGoPrevious}
							className={`fixed left-4 md:left-8 top-1/2 -translate-y-1/2 z-[95] p-4 rounded-full bg-white/90 backdrop-blur shadow-2xl transition-all ${
								canGoPrevious
									? 'hover:bg-white hover:scale-110 text-gray-700'
									: 'opacity-30 cursor-not-allowed text-gray-400'
							}`}
							title='Previous (←)'
						>
							<ChevronLeft className='h-6 w-6' />
						</button>

						{/* Next Button */}
						<button
							onClick={goToNext}
							disabled={!canGoNext}
							className={`fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-[95] p-4 rounded-full bg-white/90 backdrop-blur shadow-2xl transition-all ${
								canGoNext
									? 'hover:bg-white hover:scale-110 text-gray-700'
									: 'opacity-30 cursor-not-allowed text-gray-400'
							}`}
							title='Next (→)'
						>
							<ChevronRight className='h-6 w-6' />
						</button>

						{/* Position Indicator */}
						<div className='fixed bottom-4 left-1/2 -translate-x-1/2 z-[95] bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold tracking-wider'>
							{currentIndex + 1} / {items.length}
						</div>
					</>
				)}

				<div className='relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl ring-1 ring-black/5 flex flex-col md:flex-row animate-in fade-in zoom-in duration-300'>
					{/* Left Side: Media Deep Dive */}
					<div className='flex-1 bg-gray-950 relative flex items-center justify-center overflow-hidden min-h-[400px] md:min-h-0'>
						{showStoryFrame ? (
							<div className='h-full w-full aspect-[9/16] max-h-full flex items-center justify-center relative overflow-hidden'>
								{/* Blurred Background */}
								<img
									src={item.mediaUrl}
									alt=''
									className='absolute inset-0 h-full w-full object-cover blur-3xl opacity-40 scale-125'
								/>
								{/* Main Media */}
								<img
									src={item.mediaUrl}
									alt='Story Preview'
									className='relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
								/>
								{/* Instagram Story UI Mockup */}
								<div className='absolute inset-0 z-20 p-6 flex flex-col justify-between pointer-events-none'>
									<div className='space-y-4'>
										<div className='flex gap-1.5 h-1'>
											<div className='flex-1 bg-white/60 rounded-full h-full' />
											<div className='flex-1 bg-white/20 rounded-full h-full' />
										</div>
										<div className='flex items-center gap-3'>
											<div className='w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5'>
												<div className='w-full h-full rounded-full bg-black border-2 border-black flex items-center justify-center text-[10px] font-black text-white'>
													IG
												</div>
											</div>
											<div>
												<div className='text-xs font-black text-white leading-none mb-0.5'>
													Your Story
												</div>
												<div className='text-[10px] text-white/60 font-medium'>
													Antigravity Hub
												</div>
											</div>
										</div>
									</div>
								</div>

								{/* User Tags Rendering */}
								{item.userTags && item.userTags.length > 0 && (
									<div className='absolute inset-0 z-30 pointer-events-none'>
										{item.userTags.map((tag, i) => (
											<div
												key={i}
												className='absolute px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg flex items-center gap-1.5 text-white text-[11px] font-bold border border-white/20 shadow-xl'
												style={{
													left: `${tag.x * 100}%`,
													top: `${tag.y * 100}%`,
													transform: 'translate(-50%, -50%)',
												}}
											>
												<span className='opacity-70 font-black'>@</span>
												{tag.username}
											</div>
										))}
									</div>
								)}
							</div>
						) : (
							<div className='relative w-full h-full flex items-center justify-center p-8'>
								<img
									src={item.mediaUrl}
									alt='Original Preview'
									className='max-h-full max-w-full object-contain rounded-2xl shadow-2xl'
								/>
							</div>
						)}

						{/* Quick Toggle Overlay */}
						<div className='absolute bottom-8 left-1/2 -translate-x-1/2 z-40 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl flex'>
							<button
								onClick={() => setShowStoryFrame(false)}
								className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!showStoryFrame ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
							>
								<Eye className='inline-block h-4 w-4 mr-2' />
								Original
							</button>
							<button
								onClick={() => setShowStoryFrame(true)}
								className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${showStoryFrame ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
							>
								<Share2 className='inline-block h-4 w-4 mr-2' />
								Story View
							</button>
						</div>
					</div>

					{/* Right Side: Insights & Controls */}
					<div className='md:w-[450px] bg-white flex flex-col'>
						{/* Header */}
						<div className='p-8 border-b border-gray-100 flex items-center justify-between'>
							<div>
								<h2 className='text-2xl font-black text-gray-900 leading-tight truncate max-w-[280px]'>
									{item.title || 'Post Insights'}
								</h2>
								<div className='flex items-center gap-2 mt-1'>
									<span className='inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
									<p className='text-[11px] text-gray-400 font-bold uppercase tracking-widest'>
										{item.source} • {item.mediaType}
									</p>
								</div>
							</div>
							<button
								onClick={onClose}
								className='p-3 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-2xl transition-all active:scale-[0.9]'
							>
								<X className='h-6 w-6' />
							</button>
						</div>

						{/* Scrollable Content */}
						<div className='flex-1 overflow-y-auto p-8 space-y-10'>
							{/* Status Section */}
							<section className='space-y-4'>
								<div className='flex items-center justify-between'>
									<h3 className='text-xs font-black text-gray-400 uppercase tracking-[0.2em]'>
										Timeline
									</h3>
									<Info className='h-4 w-4 text-gray-200' />
								</div>

								<div className='space-y-6 relative'>
									<div className='absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-100' />

									<div className='flex gap-4 relative z-10'>
										<div className='w-8 h-8 rounded-full bg-emerald-50 border-4 border-white flex items-center justify-center text-emerald-500 shadow-sm'>
											<CheckCircle2 className='h-4 w-4' />
										</div>
										<div>
											<p className='text-xs font-black text-gray-900'>
												Post Submitted
											</p>
											<p className='text-[10px] text-gray-400 font-bold'>
												{new Date(item.createdAt).toLocaleString()}
											</p>
										</div>
									</div>

									{item.scheduledTime && (
										<div className='flex gap-4 relative z-10'>
											<div className='w-8 h-8 rounded-full bg-amber-50 border-4 border-white flex items-center justify-center text-amber-500 shadow-sm'>
												<Clock className='h-4 w-4' />
											</div>
											<div>
												<p className='text-xs font-black text-gray-900 uppercase'>
													Queued for Reveal
												</p>
												<p className='text-[10px] text-amber-600 font-black'>
													{new Date(item.scheduledTime).toLocaleString()}
												</p>
											</div>
										</div>
									)}

									{item.publishedAt && (
										<div className='flex gap-4 relative z-10'>
											<div className='w-8 h-8 rounded-full bg-indigo-50 border-4 border-white flex items-center justify-center text-indigo-500 shadow-sm'>
												<Globe className='h-4 w-4' />
											</div>
											<div>
												<p className='text-xs font-black text-gray-900'>
													Successfully Published
												</p>
												<p className='text-[10px] text-indigo-400 font-bold'>
													{new Date(item.publishedAt).toLocaleString()}
												</p>
											</div>
										</div>
									)}

									{item.error && (
										<div className='flex gap-4 relative z-10'>
											<div className='w-8 h-8 rounded-full bg-red-50 border-4 border-white flex items-center justify-center text-red-500 shadow-sm'>
												<AlertCircle className='h-4 w-4' />
											</div>
											<div>
												<p className='text-xs font-black text-red-900 leading-tight'>
													Publication Failed
												</p>
												<p className='text-[10px] text-red-500/60 font-bold max-w-[200px]'>
													{item.error}
												</p>
											</div>
										</div>
									)}
								</div>
							</section>

							{/* Insights Section - Only for published posts */}
							{item.publishingStatus === 'published' && item.igMediaId && (
								<InsightsPanel contentId={item.id} />
							)}

							{/* Caption Section */}
							{item.caption && (
								<section className='space-y-4'>
									<div className='flex items-center justify-between'>
										<h3 className='text-xs font-black text-gray-400 uppercase tracking-[0.2em]'>
											Final Caption
										</h3>
									</div>
									<div className='p-6 bg-gray-50 rounded-[2rem] border border-gray-100/50'>
										<p className='text-sm text-gray-600 font-medium leading-[1.8] tracking-tight whitespace-pre-wrap select-all'>
											{item.caption}
										</p>
									</div>
								</section>
							)}

							{/* Metadata Grid */}
							<section className='pt-4 border-t border-gray-50'>
								<div className='grid grid-cols-2 gap-6'>
									<div className='space-y-1'>
										<p className='text-[10px] font-black text-gray-300 uppercase tracking-widest'>
											Owner
										</p>
										<p className='text-xs font-bold text-gray-900 truncate'>
											{formatCreatorName(item.userEmail)}
										</p>
									</div>
									<div className='space-y-1'>
										<p className='text-[10px] font-black text-gray-300 uppercase tracking-widest'>
											Content Type
										</p>
										<p className='text-xs font-bold text-gray-900 capitalize'>
											{item.mediaType.toLowerCase()}
										</p>
									</div>
								</div>
							</section>
						</div>

						{/* Footer Actions */}
						<div className='p-8 pt-0 flex flex-col gap-3'>
							{/* Approval buttons for pending submissions */}
							{isAdmin && isPendingSubmission && (
								<div className='flex gap-2'>
									<button
										onClick={handleApprove}
										disabled={isReviewing}
										className='flex-1 h-14 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-200 disabled:opacity-50'
									>
										{isReviewing ? (
											<Loader2 className='h-4 w-4 animate-spin' />
										) : (
											<ThumbsUp className='h-4 w-4' />
										)}
										Approve
									</button>
									<button
										onClick={() => setShowRejectDialog(true)}
										disabled={isReviewing}
										className='flex-1 h-14 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-rose-200 disabled:opacity-50'
									>
										<ThumbsDown className='h-4 w-4' />
										Reject
									</button>
								</div>
							)}

							{/* Publish/Schedule buttons for non-pending items */}
							{item.publishingStatus !== 'published' && !isPendingSubmission && (
								<div className='flex gap-2'>
									{(item.source !== 'submission' ||
										item.submissionStatus === 'approved') && (
										<button
											onClick={() => setShowConfirmPublish(true)}
											className='flex-1 h-14 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-200'
										>
											<Send className='h-4 w-4' />
											Publish Now
										</button>
									)}
									<button
										onClick={() => {
											onClose();
											onEdit(item);
										}}
										className='flex-1 h-14 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-200'
									>
										<CalendarClock className='h-4 w-4' />
										{item.publishingStatus === 'scheduled'
											? 'Update'
											: 'Schedule'}
									</button>
								</div>
							)}
							<div className='flex gap-2'>
								<button
									onClick={onClose}
									className='flex-1 h-14 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 hover:text-gray-900 transition-all font-bold text-xs uppercase tracking-widest'
								>
									Dismiss
								</button>
								{isAdmin && (
									<button
										onClick={() => setShowConfirmDelete(true)}
										className='h-14 px-6 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 hover:text-rose-600 transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2'
										title='Delete this content'
									>
										<Trash2 className='h-4 w-4' />
									</button>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			<ConfirmationDialog
				isOpen={showConfirmPublish}
				onClose={() => setShowConfirmPublish(false)}
				onConfirm={handlePublishNow}
				title='Ready to Publish?'
				message="This bypasses any scheduled time and reveals this masterpiece to the world immediately. Let's do it!"
				confirmLabel='Go Live Now'
				type='success'
				isLoading={isPublishing}
			/>

			<ConfirmationDialog
				isOpen={showConfirmDelete}
				onClose={() => setShowConfirmDelete(false)}
				onConfirm={handleDelete}
				title='Delete Content?'
				message='This will permanently delete this content. This action cannot be undone.'
				confirmLabel='Delete'
				type='danger'
				isLoading={isDeleting}
			/>

			{/* Rejection Dialog */}
			{showRejectDialog && (
				<>
					<div
						className='fixed inset-0 z-[100] bg-black/50'
						onClick={() => setShowRejectDialog(false)}
					/>
					<div className='fixed inset-0 z-[110] flex items-center justify-center p-4'>
						<div className='bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl'>
							<h3 className='text-xl font-black text-gray-900 mb-2'>
								Reject Submission
							</h3>
							<p className='text-sm text-gray-500 mb-6'>
								Please provide a reason for rejection. This will be shared with
								the submitter.
							</p>
							<textarea
								value={rejectionReason}
								onChange={(e) => setRejectionReason(e.target.value)}
								placeholder='Reason for rejection...'
								className='w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all min-h-[100px] text-sm'
							/>
							<div className='flex gap-3 mt-6'>
								<button
									onClick={() => setShowRejectDialog(false)}
									className='flex-1 h-12 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-bold text-sm transition-all'
								>
									Cancel
								</button>
								<button
									onClick={handleReject}
									disabled={!rejectionReason.trim() || isReviewing}
									className='flex-1 h-12 bg-rose-500 text-white rounded-xl hover:bg-rose-600 font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2'
								>
									{isReviewing && <Loader2 className='h-4 w-4 animate-spin' />}
									Reject
								</button>
							</div>
						</div>
					</div>
				</>
			)}
		</>
	);
}
