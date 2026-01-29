'use client';

import { useState, useEffect } from 'react';
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MemeSubmission } from '@/lib/types/posts';
import { Calendar, Clock, GripVertical, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface MemeQueueBuilderProps {
	onRefresh?: () => void;
}

interface QueueItem extends MemeSubmission {
	position: number;
}

export function MemeQueueBuilder({ onRefresh }: MemeQueueBuilderProps) {
	const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const fetchScheduledMemes = async () => {
		setIsLoading(true);
		try {
			const res = await fetch('/api/memes?status=scheduled');
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);

			// Sort by scheduled time and add position
			const sorted = (data.memes || [])
				.sort((a: MemeSubmission, b: MemeSubmission) => {
					const timeA = a.scheduled_time || 0;
					const timeB = b.scheduled_time || 0;
					return timeA - timeB;
				})
				.map((meme: MemeSubmission, index: number) => ({
					...meme,
					position: index,
				}));

			setQueueItems(sorted);
			setHasChanges(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to load queue',
			);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchScheduledMemes();
	}, []);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			setQueueItems((items) => {
				const oldIndex = items.findIndex((item) => item.id === active.id);
				const newIndex = items.findIndex((item) => item.id === over.id);

				const newItems = arrayMove(items, oldIndex, newIndex);

				// Update positions
				return newItems.map((item, index) => ({
					...item,
					position: index,
				}));
			});
			setHasChanges(true);
		}
	};

	const calculateNewScheduledTimes = () => {
		if (queueItems.length === 0) return [];

		const now = Date.now();
		const baseTime = Math.max(now, queueItems[0].scheduled_time || now);
		const intervalMs = 2 * 60 * 60 * 1000; // 2 hours between posts

		return queueItems.map((item, index) => ({
			id: item.id!,
			scheduledTime: baseTime + index * intervalMs,
		}));
	};

	const handleSave = async () => {
		if (!hasChanges) return;

		setIsSaving(true);
		try {
			const updates = calculateNewScheduledTimes();

			const res = await fetch('/api/memes/reorder', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ updates }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to save queue');
			}

			toast.success('Queue updated successfully!');
			setHasChanges(false);
			await fetchScheduledMemes();
			onRefresh?.();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to save queue',
			);
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) {
		return (
			<div className='bg-white rounded-2xl border border-slate-200 p-12 text-center'>
				<RefreshCw className='w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4' />
				<p className='text-slate-500 font-medium'>Loading queue...</p>
			</div>
		);
	}

	if (queueItems.length === 0) {
		return (
			<div className='bg-white rounded-2xl border border-slate-200 p-12 text-center'>
				<Calendar className='w-12 h-12 text-slate-300 mx-auto mb-4' />
				<h3 className='text-xl font-bold text-slate-900 mb-2'>
					No Scheduled Memes
				</h3>
				<p className='text-slate-500'>
					Schedule some memes to see them in the queue builder.
				</p>
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div>
					<h3 className='text-xl font-bold text-slate-900'>Publishing Queue</h3>
					<p className='text-sm text-slate-500 mt-1'>
						Drag to reorder • {queueItems.length} meme
						{queueItems.length !== 1 ? 's' : ''} scheduled
					</p>
				</div>
				<div className='flex items-center gap-3'>
					<button
						onClick={fetchScheduledMemes}
						disabled={isSaving}
						className='inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition disabled:opacity-50'
					>
						<RefreshCw className='w-4 h-4' />
						Refresh
					</button>
					{hasChanges && (
						<button
							onClick={handleSave}
							disabled={isSaving}
							className='inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-50 shadow-lg shadow-indigo-500/30 animate-in fade-in slide-in-from-right-2'
						>
							<Save className='w-4 h-4' />
							{isSaving ? 'Saving...' : 'Save Queue'}
						</button>
					)}
				</div>
			</div>

			{/* Queue Timeline */}
			<div className='bg-white rounded-2xl border border-slate-200 overflow-hidden'>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={queueItems.map((item) => item.id!)}
						strategy={verticalListSortingStrategy}
					>
						<div className='divide-y divide-slate-100'>
							{queueItems.map((item, index) => (
								<SortableQueueItem
									key={item.id}
									item={item}
									index={index}
									totalItems={queueItems.length}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			</div>

			{/* Info Panel */}
			<div className='bg-indigo-50 rounded-xl p-4 border border-indigo-100'>
				<div className='flex items-start gap-3'>
					<Clock className='w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5' />
					<div className='text-sm'>
						<p className='font-bold text-indigo-900 mb-1'>
							How Queue Reordering Works
						</p>
						<p className='text-indigo-700'>
							Drag memes to reorder them. When you save, scheduled times will be
							automatically recalculated with 2-hour intervals between posts,
							starting from the earliest scheduled time.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

interface SortableQueueItemProps {
	item: QueueItem;
	index: number;
	totalItems: number;
}

function SortableQueueItem({
	item,
	index,
	totalItems,
}: SortableQueueItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id! });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const scheduledDate = item.scheduled_time
		? new Date(item.scheduled_time)
		: null;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition ${
				isDragging ? 'opacity-50 bg-slate-100' : ''
			}`}
		>
			{/* Drag Handle */}
			<button
				{...attributes}
				{...listeners}
				className='flex-shrink-0 p-2 hover:bg-slate-100 rounded-lg transition cursor-grab active:cursor-grabbing'
			>
				<GripVertical className='w-5 h-5 text-slate-400' />
			</button>

			{/* Position Badge */}
			<div className='flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center'>
				{index + 1}
			</div>

			{/* Thumbnail */}
			<div className='relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0'>
				<Image
					src={item.media_url}
					alt={item.title || 'Meme'}
					fill
					className='object-cover'
					unoptimized
				/>
			</div>

			{/* Content */}
			<div className='flex-1 min-w-0'>
				<p className='font-bold text-slate-900 truncate'>
					{item.title || 'Untitled Meme'}
				</p>
				<p className='text-xs text-slate-500 truncate'>by {item.user_email}</p>
			</div>

			{/* Scheduled Time */}
			<div className='flex-shrink-0 text-right'>
				<div className='flex items-center gap-2 text-sm font-bold text-slate-700'>
					<Clock className='w-4 h-4 text-slate-400' />
					{scheduledDate ? (
						<>
							<span>
								{scheduledDate.toLocaleDateString([], {
									month: 'short',
									day: 'numeric',
								})}
							</span>
							<span className='text-slate-400'>•</span>
							<span>
								{scheduledDate.toLocaleTimeString([], {
									hour: '2-digit',
									minute: '2-digit',
								})}
							</span>
						</>
					) : (
						<span className='text-slate-400'>Not scheduled</span>
					)}
				</div>
				{index < totalItems - 1 && (
					<p className='text-xs text-slate-400 mt-1'>Next in 2 hours</p>
				)}
			</div>
		</div>
	);
}
