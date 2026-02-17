'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Clock, AlertCircle, Eye, Heart, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';

type StoryStatus = 'scheduled' | 'draft' | 'queued' | 'published' | 'failed' | 'processing';

const statusConfig: Record<StoryStatus, { label: string; color: string; bg: string; border: string }> = {
	scheduled: {
		label: 'SCHEDULED',
		color: 'text-blue-600',
		bg: 'bg-blue-50',
		border: 'border-l-blue-500',
	},
	draft: {
		label: 'DRAFT',
		color: 'text-gray-500',
		bg: 'bg-gray-100',
		border: 'border-l-gray-400',
	},
	queued: {
		label: 'QUEUED',
		color: 'text-purple-600',
		bg: 'bg-purple-50',
		border: 'border-l-purple-500',
	},
	published: {
		label: 'PUBLISHED',
		color: 'text-emerald-600',
		bg: 'bg-emerald-50',
		border: 'border-l-emerald-500',
	},
	failed: {
		label: 'FAILED',
		color: 'text-red-600',
		bg: 'bg-red-50',
		border: 'border-l-red-500',
	},
	processing: {
		label: 'PROCESSING',
		color: 'text-amber-600',
		bg: 'bg-amber-50',
		border: 'border-l-amber-500',
	},
};

interface StoryCardEnhancedProps {
	item: ContentItem;
	onClick?: (item: ContentItem) => void;
	showPhonePreview?: boolean;
	engagement?: { views?: number; likes?: number };
	hasOverlap?: boolean;
}

export function StoryCardEnhanced({
	item,
	onClick,
	showPhonePreview = false,
	engagement,
	hasOverlap = false,
}: StoryCardEnhancedProps) {
	const [imageError, setImageError] = useState(false);

	const status = (item.publishingStatus || 'draft') as StoryStatus;
	const config = statusConfig[status] || statusConfig.draft;
	const scheduledDate = item.scheduledTime ? new Date(item.scheduledTime) : null;

	return (
		<div
			onClick={() => onClick?.(item)}
			className={cn(
				'relative cursor-pointer overflow-hidden rounded-xl border-l-4 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5',
				'',
				config.border
			)}
		>
			{/* Overlap warning */}
			{hasOverlap && (
				<div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
					<AlertCircle className="h-3 w-3" />
					Overlapping schedule
				</div>
			)}

			<div className="flex gap-3 p-3">
				{/* Thumbnail or Phone preview */}
				{showPhonePreview ? (
					<div className="relative flex h-24 w-14 flex-shrink-0 items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-100">
						{item.mediaUrl && !imageError ? (
							<Image
								src={item.mediaUrl}
								alt=""
								fill
								className="rounded-md object-cover"
								unoptimized
								onError={() => setImageError(true)}
							/>
						) : (
							<Smartphone className="h-5 w-5 text-gray-400" />
						)}
						{/* Phone notch */}
						<div className="absolute top-0.5 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-gray-300" />
					</div>
				) : (
					<div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
						{item.mediaUrl && !imageError ? (
							<Image
								src={item.mediaUrl}
								alt=""
								fill
								className="object-cover"
								unoptimized
								onError={() => setImageError(true)}
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center">
								<Smartphone className="h-6 w-6 text-gray-400" />
							</div>
						)}
					</div>
				)}

				{/* Content */}
				<div className="min-w-0 flex-1">
					{/* Time badge - prominent */}
					{scheduledDate && (
						<div className="mb-1.5 flex items-center gap-1.5">
							<Clock className="h-3.5 w-3.5 text-[#2b6cee]" />
							<span className="text-xs font-bold uppercase tracking-wide text-gray-900">
								Scheduled for {format(scheduledDate, 'HH:mm')}
							</span>
						</div>
					)}

					{/* Status badge */}
					<div className="mb-1.5 flex items-center gap-2">
						<span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', config.color, config.bg)}>
							{config.label}
						</span>
						{item.mediaType && (
							<span className="text-[10px] font-medium text-gray-400">
								{item.mediaType}
							</span>
						)}
					</div>

					{/* Caption */}
					<p className="truncate text-sm text-gray-600">
						{item.caption || 'No caption'}
					</p>

					{/* Engagement metrics for published items */}
					{status === 'published' && engagement && (
						<div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
							{engagement.views !== undefined && (
								<span className="flex items-center gap-1">
									<Eye className="h-3 w-3" />
									{engagement.views.toLocaleString()}
								</span>
							)}
							{engagement.likes !== undefined && (
								<span className="flex items-center gap-1">
									<Heart className="h-3 w-3" />
									{engagement.likes.toLocaleString()}
								</span>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
