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
import { MoreVertical, Clock, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

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
				onClick={onClick}
				data-item-id={item.id}
				data-publishing-status={item.publishingStatus}
				className={cn(
					'group flex h-[72px] w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md border bg-white p-1.5 shadow-sm transition-all dark:bg-slate-900',
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
				<div className="relative h-full w-12 flex-shrink-0 overflow-hidden rounded">
					{!imageError ? (
						<>
							<div
								className="absolute inset-0 bg-cover bg-center"
								style={{ backgroundImage: `url(${item.mediaUrl})` }}
							/>
							<img
								src={item.mediaUrl}
								alt=""
								className="sr-only"
								onError={() => setImageError(true)}
							/>
						</>
					) : (
						<div className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-slate-800">
							<span className="text-[6px] text-gray-400">N/A</span>
						</div>
					)}
					{/* Status indicator bar */}
					<div
						className={cn(
							'absolute bottom-0 left-0 right-0 h-1',
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
				<div className="flex min-w-0 flex-1 flex-col justify-center">
					<div className="flex items-center gap-1">
						<span
							className={cn(
								'flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-bold uppercase text-white',
								status.className
							)}
						>
							{status.icon}
						</span>
						<p className="truncate text-[10px] font-semibold text-gray-900 dark:text-white">
							{title}
						</p>
					</div>
					{scheduledTime && (
						<p className="mt-0.5 text-[9px] font-medium text-gray-500 dark:text-slate-400">
							{format(scheduledTime, 'h:mm a')}
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
					style={{ backgroundImage: `url(${item.mediaUrl})` }}
				>
					<img
						src={item.mediaUrl}
						alt=""
						className="sr-only"
						onError={() => setImageError(true)}
					/>
				</div>
			) : (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-slate-800">
					<span className="text-[8px] text-gray-500 dark:text-slate-500">No preview</span>
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
							{format(scheduledTime, 'h:mm a')}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
