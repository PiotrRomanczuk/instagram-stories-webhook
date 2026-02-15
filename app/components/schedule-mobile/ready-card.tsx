'use client';

/**
 * ReadyCard - Individual card for the Ready to Post list
 *
 * Extracted from mobile-ready-to-post.tsx for reuse with SwipeableReadyCard.
 */

import Image from 'next/image';
import { Check, Video, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import { format, isToday, isYesterday } from 'date-fns';

export function getApprovalLabel(item: ContentItem): string {
	const d = new Date(item.reviewedAt || item.updatedAt || item.createdAt);
	if (isToday(d)) return 'Approved Today';
	if (isYesterday(d)) return 'Approved Yesterday';
	return `Approved ${format(d, 'MMM d')}`;
}

export function getApprovalTime(item: ContentItem): string {
	const d = new Date(item.reviewedAt || item.updatedAt || item.createdAt);
	return format(d, 'h:mm a');
}

interface ReadyCardProps {
	item: ContentItem;
	isSelected: boolean;
	selectMode: boolean;
	imageError: boolean;
	onImageError: () => void;
	onClick: () => void;
}

export function ReadyCard({
	item,
	isSelected,
	selectMode,
	imageError,
	onImageError,
	onClick,
}: ReadyCardProps) {
	const approvalLabel = getApprovalLabel(item);
	const approvalTime = getApprovalTime(item);
	const isGreen = approvalLabel === 'Approved Today';
	const isVideo = item.mediaType === 'VIDEO';

	return (
		<div
			onClick={onClick}
			className={cn(
				'relative z-10 flex items-center gap-4 rounded-xl p-3 shadow-sm transition active:scale-[0.98]',
				isSelected
					? 'border-2 border-blue-500 bg-blue-50'
					: 'border border-gray-100 bg-white',
			)}
		>
			{/* Selection check badge */}
			{isSelected && (
				<div className="absolute -left-2 -top-2 z-20 rounded-full bg-blue-500 p-0.5 text-white shadow-md">
					<Check className="h-3.5 w-3.5" />
				</div>
			)}

			{/* Thumbnail */}
			<div
				className={cn(
					'relative h-24 w-24 shrink-0 overflow-hidden rounded-lg',
					isVideo && !item.mediaUrl
						? 'flex items-center justify-center bg-purple-100 text-purple-500'
						: 'bg-gray-200',
				)}
			>
				{isVideo && !item.mediaUrl ? (
					<Video className="h-8 w-8" />
				) : item.mediaUrl && !imageError ? (
					<Image
						src={item.mediaUrl}
						alt={item.caption || 'Content preview'}
						fill
						className="object-cover"
						unoptimized
						onError={onImageError}
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						<ImageIcon className="h-8 w-8 text-gray-400" />
					</div>
				)}
				{/* Blue dot for new items */}
				{isGreen && (
					<div className="absolute right-1 top-1 h-2 w-2 rounded-full border border-white bg-blue-500" />
				)}
			</div>

			{/* Content */}
			<div className="min-w-0 flex-1">
				<div className="mb-1 flex items-start justify-between">
					<span
						className={cn(
							'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
							isGreen
								? 'bg-green-100 text-green-600'
								: 'bg-gray-100 text-gray-500',
						)}
					>
						{approvalLabel}
					</span>
					<span className="text-xs text-gray-400">{approvalTime}</span>
				</div>
				<h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
					{item.caption || item.title || 'Untitled content'}
				</h3>
			</div>
		</div>
	);
}
