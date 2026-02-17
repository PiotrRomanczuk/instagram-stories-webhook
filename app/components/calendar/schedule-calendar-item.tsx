'use client';

/**
 * Schedule Calendar Item - Story card displayed on the calendar grid
 * Supports two variants:
 * - 'card': Full 9:16 aspect ratio card (for sidebar)
 * - 'compact': Small horizontal card (for calendar grid)
 */

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ContentItem } from '@/lib/types/posts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { MoreVertical, Clock, AlertTriangle, CheckCircle, Loader2, Play } from 'lucide-react';

interface ScheduleCalendarItemProps {
	item: ContentItem;
	onClick?: () => void;
	isDraggable?: boolean;
	variant?: 'card' | 'compact';
	showMinute?: boolean;
}

function getStatusBadge(item: ContentItem) {
	if (item.publishingStatus === 'published') {
		return {
			label: 'Published',
			className: 'bg-emerald-500/80',
			icon: <CheckCircle className="h-2.5 w-2.5" />,
		};
	}
	if (item.publishingStatus === 'processing') {
		return {
			label: 'Processing',
			className: 'bg-yellow-500/80',
			icon: <Loader2 className="h-2.5 w-2.5 animate-spin" />,
		};
	}
	if (item.publishingStatus === 'failed') {
		return {
			label: 'Failed',
			className: 'bg-red-500/80',
			icon: <AlertTriangle className="h-2.5 w-2.5" />,
		};
	}
	return {
		label: 'Scheduled',
		className: 'bg-[#2b6cee]/80',
		icon: <Clock className="h-2.5 w-2.5" />,
	};
}

export function ScheduleCalendarItem({
	item,
	onClick,
	isDraggable = true,
	variant = 'card',
}: ScheduleCalendarItemProps) {
	const [imageError, setImageError] = useState(false);
	const isVideo = item.mediaType === 'VIDEO';
	const thumbnailSrc = isVideo && item.thumbnailUrl ? item.thumbnailUrl : item.mediaUrl;

	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: item.id,
			data: item,
			disabled: !isDraggable || item.publishingStatus === 'published',
		});

	const style = transform
		? {
				transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
			}
		: undefined;

	const status = getStatusBadge(item);
	const scheduledTime = item.scheduledTime ? new Date(item.scheduledTime) : null;
	const title = item.title || item.caption?.slice(0, 30) || 'Untitled';

	const dragProps = isDraggable && item.publishingStatus !== 'published'
		? { ...listeners, ...attributes }
		: {};

	// Compact variant for calendar grid - horizontal card with small thumbnail
	if (variant === 'compact') {
		return (
			<div
				ref={setNodeRef}
				style={style}
				{...dragProps}
				onClick={(e) => {
					// Only trigger click if not dragging
					if (!isDragging) {
						onClick?.();
					}
				}}
				data-item-id={item.id}
				data-draggable-id={item.id}
				data-publishing-status={item.publishingStatus}
				className={cn(
					'group flex h-full w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md border bg-white p-1 shadow-sm transition-all',
					isDragging && 'z-50 opacity-80 shadow-xl scale-105',
					item.publishingStatus === 'failed'
						? 'border-red-500/50'
						: item.publishingStatus === 'published'
						? 'border-emerald-500/40'
						: 'border-[#2b6cee]/40 hover:border-[#2b6cee] hover:shadow-md',
					isDraggable && item.publishingStatus !== 'published' && 'cursor-grab active:cursor-grabbing'
				)}
			>
				{/* Thumbnail */}
				<div className="relative aspect-square h-full flex-shrink-0 overflow-hidden rounded">
					{!imageError ? (
						<>
							<div
								className="absolute inset-0 bg-cover bg-center"
								style={{ backgroundImage: `url(${thumbnailSrc})` }}
							/>
							<img
								src={thumbnailSrc}
								alt=""
								className="sr-only"
								onError={() => setImageError(true)}
							/>
							{isVideo && (
								<div className="absolute inset-0 flex items-center justify-center">
									<Play className="h-2.5 w-2.5 text-white drop-shadow" fill="white" />
								</div>
							)}
						</>
					) : (
						<div className="flex h-full w-full items-center justify-center bg-gray-200">
							<span className="text-[6px] text-gray-400">N/A</span>
						</div>
					)}
					{/* Status indicator bar */}
					<div
						className={cn(
							'absolute bottom-0 left-0 right-0 h-0.5',
							item.publishingStatus === 'failed'
								? 'bg-red-500'
								: item.publishingStatus === 'published'
								? 'bg-emerald-500'
								: item.publishingStatus === 'processing'
								? 'bg-yellow-500'
								: 'bg-[#2b6cee]'
						)}
					/>
				</div>

				{/* Content */}
				<div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
					<p className="truncate text-[9px] font-semibold leading-tight text-gray-900">
						{title}
					</p>
					{scheduledTime && (
						<p className="truncate text-[8px] font-medium text-gray-500">
							{format(scheduledTime, 'HH:mm')}
						</p>
					)}
				</div>
			</div>
		);
	}

	// Card variant - full 9:16 aspect ratio (for sidebar)
	return (
		<div
			ref={setNodeRef}
			style={style}
			{...dragProps}
			onClick={onClick}
			data-item-id={item.id}
			data-publishing-status={item.publishingStatus}
			className={cn(
				'group relative aspect-[9/16] w-full cursor-pointer overflow-hidden rounded-lg border-2 shadow-lg transition-all',
				isDragging && 'z-50 opacity-80 shadow-2xl scale-105',
				item.publishingStatus === 'failed'
					? 'border-red-500/50'
					: item.publishingStatus === 'published'
					? 'border-emerald-500/30'
					: 'border-[#2b6cee]/50 hover:border-[#2b6cee]',
				isDraggable && item.publishingStatus !== 'published' && 'cursor-grab active:cursor-grabbing'
			)}
		>
			{/* Background Image */}
			{!imageError ? (
				<div
					className="absolute inset-0 bg-cover bg-center"
					style={{ backgroundImage: `url(${thumbnailSrc})` }}
				>
					<img
						src={thumbnailSrc}
						alt=""
						className="sr-only"
						onError={() => setImageError(true)}
					/>
				</div>
			)
			: (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-200">
					<span className="text-[8px] text-gray-500">No preview</span>
				</div>
			)}

			{/* Video play indicator overlay */}
			{isVideo && (
				<div className="absolute inset-0 flex items-center justify-center z-10">
					<div className="rounded-full bg-black/50 p-1.5 backdrop-blur-sm">
						<Play className="h-4 w-4 text-white" fill="white" />
					</div>
				</div>
			)}

			{/* Gradient overlay */}
			<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

			{/* Content */}
			<div className="absolute inset-0 flex flex-col justify-between p-1.5">
				{/* Top row */}
				<div className="flex items-start justify-between">
					<span
						className={cn(
							'flex items-center gap-0.5 rounded px-1 py-0.5 text-[7px] font-bold uppercase tracking-tight text-white',
							status.className
						)}
					>
						{status.icon}
						{status.label}
					</span>
					<button
						onClick={(e) => {
							e.stopPropagation();
							onClick?.();
						}}
						className="rounded p-0.5 text-white/80 opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100"
					>
						<MoreVertical className="h-3 w-3" />
					</button>
				</div>

				{/* Bottom row */}
				<div>
					<p className="truncate text-[9px] font-bold leading-tight text-white">
						{title}
					</p>
					{scheduledTime && (
						<p className="mt-0.5 text-[7px] text-white/70">
							{format(scheduledTime, 'HH:mm')}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
