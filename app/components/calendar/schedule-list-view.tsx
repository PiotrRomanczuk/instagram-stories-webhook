'use client';

import { format, isSameDay } from 'date-fns';
import { Clock, Image as ImageIcon, Video, AlertCircle, Eye, Heart, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import Image from 'next/image';
import { useState } from 'react';
import { getFriendlyErrorShort } from '@/lib/utils/friendly-error';

interface ScheduleListViewProps {
	currentDate: Date;
	scheduledItems: ContentItem[];
	onItemClick?: (item: ContentItem) => void;
	showAllDates?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
	scheduled: { label: 'SCHEDULED', color: 'text-blue-600', bg: 'bg-blue-50' },
	published: { label: 'PUBLISHED', color: 'text-emerald-600', bg: 'bg-emerald-50' },
	failed: { label: 'FAILED', color: 'text-red-600', bg: 'bg-red-50' },
	processing: { label: 'PROCESSING', color: 'text-amber-600', bg: 'bg-amber-50' },
	draft: { label: 'DRAFT', color: 'text-gray-600', bg: 'bg-gray-50' },
};

const statusBorderColors: Record<string, string> = {
	scheduled: 'border-l-blue-500',
	published: 'border-l-emerald-500',
	failed: 'border-l-red-500',
	processing: 'border-l-amber-500',
	draft: 'border-l-gray-400',
};

function ListItem({ item, onItemClick }: { item: ContentItem; onItemClick?: (item: ContentItem) => void }) {
	const [imageError, setImageError] = useState(false);
	const scheduledDate = item.scheduledTime ? new Date(item.scheduledTime) : null;
	const status = item.publishingStatus || 'draft';
	const config = statusConfig[status] || statusConfig.draft;
	const borderColor = statusBorderColors[status] || statusBorderColors.draft;
	const isFailed = status === 'failed';
	const isVideo = item.mediaType === 'VIDEO';
	const thumbnailSrc = isVideo && item.thumbnailUrl ? item.thumbnailUrl : item.mediaUrl;

	return (
		<button
			type="button"
			onClick={() => onItemClick?.(item)}
			className={cn(
				'flex w-full items-center gap-3 border-l-4 bg-white p-3 text-left transition-colors hover:bg-gray-50',
				'',
				borderColor
			)}
		>
			{/* Thumbnail */}
			<div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
				{item.mediaUrl && !imageError ? (
					<>
						<Image
							src={thumbnailSrc}
							alt=""
							fill
							className="object-cover"
							unoptimized
							onError={() => setImageError(true)}
						/>
						{isVideo && (
							<div className="absolute inset-0 flex items-center justify-center">
								<Play className="h-3 w-3 text-white drop-shadow" fill="white" />
							</div>
						)}
					</>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						{item.mediaType === 'VIDEO' ? (
							<Video className="h-5 w-5 text-gray-400" />
						) : (
							<ImageIcon className="h-5 w-5 text-gray-400" />
						)}
					</div>
				)}
			</div>

			{/* Content */}
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					{/* Time */}
					{scheduledDate && (
						<span className="flex items-center gap-1 text-xs font-semibold text-gray-900">
							<Clock className="h-3 w-3" />
							{format(scheduledDate, 'HH:mm')}
						</span>
					)}
					{/* Status badge */}
					<span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', config.color, config.bg)}>
						{config.label}
						{isFailed && item.retryCount !== undefined && item.retryCount > 0 && (
							<span className="ml-1 opacity-70">
								({item.retryCount}x)
							</span>
						)}
					</span>
				</div>
				<p className="mt-0.5 truncate text-sm text-gray-600">
					{item.caption || 'No caption'}
				</p>
				{isFailed && item.error && (
					<p className="mt-0.5 truncate text-xs text-red-500">
						{getFriendlyErrorShort(item.error)}
					</p>
				)}
			</div>

			{/* Right side - engagement or warning */}
			<div className="flex flex-shrink-0 flex-col items-end gap-1">
				{status === 'published' && (
					<div className="flex items-center gap-2 text-xs text-gray-400">
						<span className="flex items-center gap-0.5">
							<Eye className="h-3 w-3" /> --
						</span>
						<span className="flex items-center gap-0.5">
							<Heart className="h-3 w-3" /> --
						</span>
					</div>
				)}
				{isFailed && (
					<AlertCircle className="h-4 w-4 text-red-500" />
				)}
			</div>
		</button>
	);
}

export function ScheduleListView({ currentDate, scheduledItems, onItemClick, showAllDates }: ScheduleListViewProps) {
	// Filter items - show all when showAllDates is true, otherwise filter by selected date
	const dayItems = scheduledItems
		.filter((item) => {
			if (showAllDates) return true;
			if (!item.scheduledTime) return false;
			return isSameDay(new Date(item.scheduledTime), currentDate);
		})
		.sort((a, b) => (a.scheduledTime || 0) - (b.scheduledTime || 0));

	if (dayItems.length === 0) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
				<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
					{showAllDates ? (
						<AlertCircle className="h-7 w-7 text-gray-400" />
					) : (
						<Clock className="h-7 w-7 text-gray-400" />
					)}
				</div>
				<div>
					<p className="font-semibold text-gray-900">
						{showAllDates ? 'No failed posts' : 'No stories scheduled'}
					</p>
					{!showAllDates && (
						<p className="mt-1 text-sm text-gray-500">
							{format(currentDate, 'EEEE, MMMM d')}
						</p>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-auto">
			<div className="divide-y divide-gray-100">
				{dayItems.map((item) => (
					<ListItem key={item.id} item={item} onItemClick={onItemClick} />
				))}
			</div>
		</div>
	);
}
