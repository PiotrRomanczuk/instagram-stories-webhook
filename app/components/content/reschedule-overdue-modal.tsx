'use client';

/**
 * Reschedule Overdue Modal Component
 * Shows a draggable list of overdue posts with interval-based scheduling
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
	CalendarClock,
	GripVertical,
	Loader2,
	X,
	Clock,
	ArrowRight,
	Shuffle,
	Eye,
	Trash2,
	CheckSquare,
	Square,
} from 'lucide-react';
import { ContentItem } from '@/lib/types/posts';

interface RescheduleOverdueModalProps {
	onClose: () => void;
	onSuccess: () => void;
	overdueCount: number;
}

interface OverduePost {
	id: string;
	mediaUrl: string;
	title?: string;
	caption?: string;
	scheduledTime: number;
}

/**
 * Story Preview on Hover (Desktop)
 */
function StoryPreviewHover({ mediaUrl }: { mediaUrl: string }) {
	return (
		<div className='absolute left-full ml-4 top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover/media:opacity-100 pointer-events-none transition-opacity duration-200 hidden md:block'>
			<div className='relative w-[140px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-gray-900'>
				{/* Blurred Background */}
				<img
					src={mediaUrl}
					alt=''
					className='absolute inset-0 h-full w-full object-cover blur-2xl opacity-60 scale-125'
				/>
				{/* Main Media */}
				<img
					src={mediaUrl}
					alt='Story Preview'
					className='relative z-10 h-full w-full object-contain drop-shadow-lg'
				/>
				{/* Story UI Overlay */}
				<div className='absolute inset-0 z-20 p-2 flex flex-col justify-between pointer-events-none'>
					<div className='space-y-1.5'>
						<div className='flex gap-0.5 h-0.5'>
							<div className='flex-1 bg-white/60 rounded-full' />
							<div className='flex-1 bg-white/20 rounded-full' />
						</div>
						<div className='flex items-center gap-1.5'>
							<div className='w-5 h-5 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5'>
								<div className='w-full h-full rounded-full bg-black flex items-center justify-center text-[5px] font-black text-white'>
									IG
								</div>
							</div>
							<span className='text-[7px] font-bold text-white drop-shadow'>
								Preview
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Fullscreen Story Preview (Mobile)
 */
function StoryPreviewModal({
	post,
	onClose,
}: {
	post: OverduePost;
	onClose: () => void;
}) {
	return (
		<div
			className='fixed inset-0 z-[60] bg-black/90 flex items-center justify-center animate-in fade-in duration-200'
			onClick={onClose}
		>
			<div className='relative w-full max-w-sm mx-4 aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl'>
				{/* Blurred Background */}
				<img
					src={post.mediaUrl}
					alt=''
					className='absolute inset-0 h-full w-full object-cover blur-2xl opacity-40 scale-125'
				/>
				{/* Main Media */}
				<img
					src={post.mediaUrl}
					alt='Story Preview'
					className='relative z-10 h-full w-full object-contain'
				/>
				{/* Story UI Overlay */}
				<div className='absolute inset-0 z-20 p-4 flex flex-col justify-between pointer-events-none'>
					<div className='space-y-2'>
						<div className='flex gap-1 h-1'>
							<div className='flex-1 bg-white/60 rounded-full' />
							<div className='flex-1 bg-white/20 rounded-full' />
						</div>
						<div className='flex items-center gap-2'>
							<div className='w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5'>
								<div className='w-full h-full rounded-full bg-black flex items-center justify-center text-[8px] font-black text-white'>
									IG
								</div>
							</div>
							<span className='text-xs font-bold text-white drop-shadow'>
								Story Preview
							</span>
						</div>
					</div>
					{/* Caption */}
					{post.caption && (
						<div className='bg-black/40 backdrop-blur-sm rounded-xl p-3'>
							<p className='text-xs text-white line-clamp-3'>
								{post.caption}
							</p>
						</div>
					)}
				</div>
				{/* Close button */}
				<button
					onClick={onClose}
					className='absolute top-4 right-4 z-30 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors pointer-events-auto'
				>
					<X className='h-5 w-5' />
				</button>
			</div>
		</div>
	);
}

const INTERVAL_OPTIONS = [
	{ value: 3, label: '3 minutes' },
	{ value: 5, label: '5 minutes' },
	{ value: 10, label: '10 minutes' },
	{ value: 15, label: '15 minutes' },
	{ value: 30, label: '30 minutes' },
	{ value: 60, label: '1 hour' },
	{ value: 120, label: '2 hours' },
	{ value: 180, label: '3 hours' },
	{ value: 360, label: '6 hours' },
	{ value: 720, label: '12 hours' },
	{ value: 1440, label: '24 hours' },
];

export function RescheduleOverdueModal({
	onClose,
	onSuccess,
	overdueCount,
}: RescheduleOverdueModalProps) {
	const [posts, setPosts] = useState<OverduePost[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [startDate, setStartDate] = useState('');
	const [startTime, setStartTime] = useState('');
	const [intervalMinutes, setIntervalMinutes] = useState(60);
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
	const [randomize, setRandomize] = useState(true);
	const [randomOffsets, setRandomOffsets] = useState<number[]>([]);
	const [previewPostId, setPreviewPostId] = useState<string | null>(null);
	const [selectedForReject, setSelectedForReject] = useState<Set<string>>(new Set());
	const [isRejecting, setIsRejecting] = useState(false);

	// Generate random offsets (3-10 minutes in milliseconds)
	const generateRandomOffsets = (count: number) => {
		return Array.from({ length: count }, () =>
			Math.floor(Math.random() * 7 + 3) * 60 * 1000 // 3-10 minutes
		);
	};

	// Fetch overdue posts on mount
	useEffect(() => {
		async function fetchOverduePosts() {
			try {
				const response = await fetch(
					'/api/content?tab=queue&scheduleFilter=overdue&limit=100',
				);
				if (response.ok) {
					const data = await response.json();
					const fetchedPosts = data.items.map((item: ContentItem) => ({
						id: item.id,
						mediaUrl: item.mediaUrl,
						title: item.title,
						caption: item.caption,
						scheduledTime: item.scheduledTime,
					}));
					setPosts(fetchedPosts);
					setRandomOffsets(generateRandomOffsets(fetchedPosts.length));
				}
			} catch (err) {
				console.error('Failed to fetch overdue posts:', err);
			} finally {
				setIsLoading(false);
			}
		}

		fetchOverduePosts();

		// Set default start time to next hour
		const now = new Date();
		now.setHours(now.getHours() + 1, 0, 0, 0);
		setStartDate(now.toISOString().split('T')[0]);
		setStartTime(now.toTimeString().slice(0, 5));
	}, []);

	// Calculate scheduled times based on order and interval
	const calculateScheduledTimes = useCallback(() => {
		if (!startDate || !startTime) return [];

		const baseTime = new Date(`${startDate}T${startTime}`).getTime();
		return posts.map((post, index) => {
			const baseOffset = index * intervalMinutes * 60 * 1000;
			const randomOffset = randomize && randomOffsets[index] ? randomOffsets[index] : 0;
			return {
				id: post.id,
				scheduledTime: baseTime + baseOffset + randomOffset,
			};
		});
	}, [posts, startDate, startTime, intervalMinutes, randomize, randomOffsets]);

	// Format time for display
	const formatScheduledTime = (index: number): string => {
		if (!startDate || !startTime) return '--:--';
		const baseTime = new Date(`${startDate}T${startTime}`).getTime();
		const baseOffset = index * intervalMinutes * 60 * 1000;
		const randomOffset = randomize && randomOffsets[index] ? randomOffsets[index] : 0;
		const time = new Date(baseTime + baseOffset + randomOffset);
		return time.toLocaleString([], {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	// Regenerate random offsets
	const shuffleRandomOffsets = () => {
		setRandomOffsets(generateRandomOffsets(posts.length));
	};

	// Toggle selection for rejection
	const toggleSelectForReject = (id: string) => {
		setSelectedForReject((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	// Select/deselect all for rejection
	const toggleSelectAll = () => {
		if (selectedForReject.size === posts.length) {
			setSelectedForReject(new Set());
		} else {
			setSelectedForReject(new Set(posts.map((p) => p.id)));
		}
	};

	// Remove a single post (unschedule it)
	const handleRemovePost = async (id: string) => {
		try {
			const response = await fetch(`/api/content/${id}`, {
				method: 'DELETE',
			});

			if (response.ok) {
				// Remove from local state
				const index = posts.findIndex((p) => p.id === id);
				setPosts((prev) => prev.filter((p) => p.id !== id));
				setRandomOffsets((prev) => prev.filter((_, i) => i !== index));
				setSelectedForReject((prev) => {
					const next = new Set(prev);
					next.delete(id);
					return next;
				});
			} else {
				const data = await response.json();
				alert(data.error || 'Failed to remove post');
			}
		} catch (err) {
			console.error('Failed to remove post:', err);
			alert('Failed to remove post');
		}
	};

	// Bulk reject selected posts
	const handleBulkReject = async () => {
		if (selectedForReject.size === 0) return;

		setIsRejecting(true);
		try {
			const promises = Array.from(selectedForReject).map((id) =>
				fetch(`/api/content/${id}`, { method: 'DELETE' })
			);
			await Promise.all(promises);

			// Remove from local state
			setPosts((prev) => prev.filter((p) => !selectedForReject.has(p.id)));
			setRandomOffsets((prev) => {
				const keepIndices = posts
					.map((p, i) => (!selectedForReject.has(p.id) ? i : -1))
					.filter((i) => i !== -1);
				return keepIndices.map((i) => prev[i]);
			});
			setSelectedForReject(new Set());
		} catch (err) {
			console.error('Failed to reject posts:', err);
			alert('Failed to reject some posts');
		} finally {
			setIsRejecting(false);
		}
	};

	// Drag and drop handlers
	const handleDragStart = (index: number) => {
		setDraggedIndex(index);
	};

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		setDragOverIndex(index);
	};

	const handleDragEnd = () => {
		if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
			const newPosts = [...posts];
			const [removed] = newPosts.splice(draggedIndex, 1);
			newPosts.splice(dragOverIndex, 0, removed);
			setPosts(newPosts);

			// Also reorder random offsets to match
			const newOffsets = [...randomOffsets];
			const [removedOffset] = newOffsets.splice(draggedIndex, 1);
			newOffsets.splice(dragOverIndex, 0, removedOffset);
			setRandomOffsets(newOffsets);
		}
		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	// Move item up/down with buttons (for accessibility)
	const moveItem = (index: number, direction: 'up' | 'down') => {
		if (
			(direction === 'up' && index === 0) ||
			(direction === 'down' && index === posts.length - 1)
		) {
			return;
		}

		const newPosts = [...posts];
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		[newPosts[index], newPosts[newIndex]] = [newPosts[newIndex], newPosts[index]];
		setPosts(newPosts);

		// Also swap random offsets
		const newOffsets = [...randomOffsets];
		[newOffsets[index], newOffsets[newIndex]] = [newOffsets[newIndex], newOffsets[index]];
		setRandomOffsets(newOffsets);
	};

	// Submit rescheduled posts
	const handleSubmit = async () => {
		const scheduledItems = calculateScheduledTimes();
		if (scheduledItems.length === 0) return;

		// Validate all times are in the future
		const now = Date.now();
		if (scheduledItems.some((item) => item.scheduledTime <= now)) {
			alert('Please select a future start time');
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await fetch('/api/content/reschedule-overdue', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ items: scheduledItems }),
			});

			if (response.ok) {
				onSuccess();
				onClose();
			} else {
				const data = await response.json();
				alert(data.error || 'Failed to reschedule posts');
			}
		} catch (err) {
			console.error('Failed to reschedule posts:', err);
			alert('Failed to reschedule posts');
		} finally {
			setIsSubmitting(false);
		}
	};

	// Calculate end time for preview
	const getEndTime = (): string => {
		if (!startDate || !startTime || posts.length === 0) return '';
		const baseTime = new Date(`${startDate}T${startTime}`).getTime();
		const lastIndex = posts.length - 1;
		const baseOffset = lastIndex * intervalMinutes * 60 * 1000;
		const randomOffset = randomize && randomOffsets[lastIndex] ? randomOffsets[lastIndex] : 0;
		const endTime = new Date(baseTime + baseOffset + randomOffset);
		return endTime.toLocaleString([], {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200'>
			<div className='bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200'>
				{/* Header */}
				<div className='p-6 border-b border-gray-100'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-3'>
							<div className='p-3 bg-amber-100 rounded-xl'>
								<CalendarClock className='h-6 w-6 text-amber-600' />
							</div>
							<div>
								<h3 className='text-xl font-black text-gray-900'>
									Reschedule Overdue Posts
								</h3>
								<p className='text-sm text-gray-500'>
									Drag to reorder, then set start time and interval
								</p>
							</div>
						</div>
						<button
							onClick={onClose}
							className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors'
						>
							<X className='h-5 w-5' />
						</button>
					</div>
				</div>

				{/* Settings */}
				<div className='p-6 border-b border-gray-100 bg-gray-50/50'>
					<div className='grid grid-cols-3 gap-4'>
						<div>
							<label className='block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2'>
								Start Date
							</label>
							<input
								type='date'
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								min={new Date().toISOString().split('T')[0]}
								className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400'
							/>
						</div>
						<div>
							<label className='block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2'>
								Start Time
							</label>
							<input
								type='time'
								value={startTime}
								onChange={(e) => setStartTime(e.target.value)}
								className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400'
							/>
						</div>
						<div>
							<label className='block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2'>
								Interval
							</label>
							<select
								value={intervalMinutes}
								onChange={(e) => setIntervalMinutes(Number(e.target.value))}
								className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 bg-white'
							>
								{INTERVAL_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Humanize toggle */}
					<div className='mt-4 flex items-center justify-between'>
						<label className='flex items-center gap-3 cursor-pointer'>
							<input
								type='checkbox'
								checked={randomize}
								onChange={(e) => setRandomize(e.target.checked)}
								className='w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-200'
							/>
							<span className='text-sm text-gray-700'>
								<span className='font-bold'>Humanize timing</span>
								<span className='text-gray-400 ml-1'>(+3-10 min random offset)</span>
							</span>
						</label>
						{randomize && (
							<button
								onClick={shuffleRandomOffsets}
								className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-lg transition-colors'
								title='Regenerate random offsets'
							>
								<Shuffle className='h-3.5 w-3.5' />
								Shuffle
							</button>
						)}
					</div>

					{/* Time preview */}
					{startDate && startTime && posts.length > 0 && (
						<div className='mt-4 flex items-center gap-2 text-sm text-gray-600'>
							<Clock className='h-4 w-4' />
							<span>
								{formatScheduledTime(0)}
							</span>
							<ArrowRight className='h-4 w-4 text-gray-400' />
							<span>{getEndTime()}</span>
							<span className='text-gray-400'>
								({posts.length} posts)
							</span>
						</div>
					)}
				</div>

				{/* Posts List */}
				<div className='flex-1 overflow-y-auto p-4'>
					{isLoading ? (
						<div className='flex items-center justify-center py-12'>
							<Loader2 className='h-8 w-8 animate-spin text-gray-400' />
						</div>
					) : posts.length === 0 ? (
						<div className='text-center py-12 text-gray-500'>
							No overdue posts found
						</div>
					) : (
						<div className='space-y-2'>
							{/* Selection header */}
							<div className='flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg mb-3'>
								<button
									onClick={toggleSelectAll}
									className='flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-800'
								>
									{selectedForReject.size === posts.length ? (
										<CheckSquare className='h-4 w-4 text-rose-500' />
									) : (
										<Square className='h-4 w-4' />
									)}
									{selectedForReject.size > 0
										? `${selectedForReject.size} selected`
										: 'Select to reject'}
								</button>
								{selectedForReject.size > 0 && (
									<button
										onClick={handleBulkReject}
										disabled={isRejecting}
										className='flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50'
									>
										{isRejecting ? (
											<Loader2 className='h-3.5 w-3.5 animate-spin' />
										) : (
											<Trash2 className='h-3.5 w-3.5' />
										)}
										Reject Selected
									</button>
								)}
							</div>
							{posts.map((post, index) => (
								<div
									key={post.id}
									draggable={!selectedForReject.has(post.id)}
									onDragStart={() => handleDragStart(index)}
									onDragOver={(e) => handleDragOver(e, index)}
									onDragEnd={handleDragEnd}
									className={`flex items-center gap-2 sm:gap-3 p-3 bg-white rounded-xl border transition-all ${
										selectedForReject.has(post.id)
											? 'border-rose-200 bg-rose-50/50'
											: draggedIndex === index
												? 'opacity-50 border-amber-300'
												: dragOverIndex === index
													? 'border-amber-400 bg-amber-50'
													: 'border-gray-100 hover:border-gray-200'
									}`}
								>
									{/* Selection checkbox */}
									<button
										onClick={() => toggleSelectForReject(post.id)}
										className='p-1 text-gray-300 hover:text-rose-500 shrink-0'
									>
										{selectedForReject.has(post.id) ? (
											<CheckSquare className='h-5 w-5 text-rose-500' />
										) : (
											<Square className='h-5 w-5' />
										)}
									</button>

									{/* Drag Handle */}
									<div className={`cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500 hidden sm:block ${selectedForReject.has(post.id) ? 'opacity-30' : ''}`}>
										<GripVertical className='h-5 w-5' />
									</div>

									{/* Position Number */}
									<div className='w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500 shrink-0'>
										{index + 1}
									</div>

									{/* Thumbnail with hover preview */}
									<div className='relative group/media'>
										<div
											className='w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 cursor-pointer ring-2 ring-transparent group-hover/media:ring-amber-400 transition-all'
											onClick={() => setPreviewPostId(post.id)}
										>
											<img
												src={post.mediaUrl}
												alt=''
												className='w-full h-full object-cover'
											/>
										</div>
										<StoryPreviewHover mediaUrl={post.mediaUrl} />
									</div>

									{/* Info */}
									<div className='flex-1 min-w-0'>
										<p className='text-sm font-bold text-gray-800 truncate'>
											{post.title || post.caption?.slice(0, 50) || 'Untitled'}
										</p>
										<p className='text-xs text-gray-400 hidden sm:block'>
											Was: {new Date(post.scheduledTime).toLocaleString([], {
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit',
											})}
										</p>
										{/* Mobile: show new time inline */}
										<p className='text-xs text-amber-600 font-bold sm:hidden'>
											→ {formatScheduledTime(index)}
										</p>
									</div>

									{/* Preview button (mobile) */}
									<button
										onClick={() => setPreviewPostId(post.id)}
										className='p-2 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors md:hidden'
										title='Preview'
									>
										<Eye className='h-4 w-4' />
									</button>

									{/* New Time */}
									<div className='text-right hidden sm:block'>
										<p className='text-xs font-bold text-amber-600'>
											{formatScheduledTime(index)}
										</p>
									</div>

									{/* Move buttons */}
									<div className='flex flex-col gap-0.5 hidden sm:flex'>
										<button
											onClick={() => moveItem(index, 'up')}
											disabled={index === 0 || selectedForReject.has(post.id)}
											className='p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30'
											title='Move up'
										>
											<svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 15l7-7 7 7' />
											</svg>
										</button>
										<button
											onClick={() => moveItem(index, 'down')}
											disabled={index === posts.length - 1 || selectedForReject.has(post.id)}
											className='p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30'
											title='Move down'
										>
											<svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
											</svg>
										</button>
									</div>

									{/* Remove button */}
									<button
										onClick={() => handleRemovePost(post.id)}
										className='p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0'
										title='Remove post'
									>
										<Trash2 className='h-4 w-4' />
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className='p-6 border-t border-gray-100 bg-gray-50/50'>
					<div className='flex gap-3'>
						<button
							onClick={onClose}
							className='flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors'
						>
							Cancel
						</button>
						<button
							onClick={handleSubmit}
							disabled={!startDate || !startTime || posts.length === 0 || isSubmitting}
							className='flex-1 px-6 py-3 bg-amber-500 text-white rounded-2xl font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
						>
							{isSubmitting && <Loader2 className='h-4 w-4 animate-spin' />}
							Reschedule {posts.length} Post{posts.length !== 1 ? 's' : ''}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile Preview Modal */}
			{previewPostId && (
				<StoryPreviewModal
					post={posts.find((p) => p.id === previewPostId)!}
					onClose={() => setPreviewPostId(null)}
				/>
			)}
		</div>
	);
}
