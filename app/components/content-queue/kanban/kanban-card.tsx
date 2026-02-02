'use client';

/**
 * Kanban Card Component
 * Individual story card for the kanban board
 * Shows thumbnail, title, creator, status badge, scheduled time
 */

import { useState } from 'react';
import { ContentItem, PublishingStatus } from '@/lib/types/posts';
import { cn } from '@/lib/utils';
import { Calendar, Eye, ExternalLink, AlertCircle, RefreshCw, Play, GripVertical, Pencil } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface KanbanCardProps {
	item: ContentItem;
	onPreview: (item: ContentItem) => void;
	onEdit: (item: ContentItem) => void;
	status: PublishingStatus;
}

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
 * Get initials from creator name
 */
function getInitials(name: string): string {
	const parts = name.split(/[\s._-]+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[1][0]).toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

/**
 * Format scheduled time for display
 */
function formatScheduledTime(timestamp?: number): string {
	if (!timestamp) return '';
	const date = new Date(timestamp);
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const isTomorrow = date.toDateString() === tomorrow.toDateString();

	const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

	if (isToday) return `Today, ${timeStr}`;
	if (isTomorrow) return `Tomorrow, ${timeStr}`;

	return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${timeStr}`;
}

export function KanbanCard({ item, onPreview, onEdit, status }: KanbanCardProps) {
	const [imageError, setImageError] = useState(false);
	const creatorName = formatCreatorName(item.userEmail);
	const initials = getInitials(creatorName);
	const isVideo = item.mediaType === 'VIDEO';

	// Card styling based on status
	const cardStyles: Record<PublishingStatus, string> = {
		draft: 'bg-white dark:bg-[#1a2234] border-gray-200 dark:border-[#2d3a54] hover:border-[#2b6cee]',
		scheduled: 'border-[#2b6cee]/40 bg-blue-50 dark:bg-[#2b6cee]/5 hover:border-[#2b6cee]',
		processing: 'bg-white dark:bg-[#1a2234] border-gray-200 dark:border-[#2d3a54]',
		published: 'bg-white dark:bg-[#1a2234] border-gray-200 dark:border-[#2d3a54] hover:border-emerald-500/50',
		failed: 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20',
	};

	// Thumbnail styling based on status
	const thumbnailStyles: Record<PublishingStatus, string> = {
		draft: '',
		scheduled: '',
		processing: 'opacity-60 grayscale-[0.5]',
		published: '',
		failed: 'grayscale',
	};

	return (
		<div
			className={cn(
				'group rounded-xl border p-3 transition-all cursor-pointer relative shadow-lg',
				cardStyles[status]
			)}
			onClick={() => onPreview(item)}
		>
			{/* Drag handle - shows on hover */}
			<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
				<GripVertical className="h-5 w-5 text-gray-400 dark:text-[#92a4c9] cursor-grab" />
			</div>

			{/* Thumbnail - 9:16 aspect ratio */}
			<div
				className={cn(
					'w-full rounded-lg bg-cover bg-center mb-3 border border-gray-200 dark:border-[#2d3a54]/50 aspect-[9/16] relative overflow-hidden',
					thumbnailStyles[status]
				)}
			>
				{!imageError && item.mediaUrl ? (
					<img
						src={item.mediaUrl}
						alt={item.title || 'Story thumbnail'}
						className="absolute inset-0 h-full w-full object-cover"
						onError={() => setImageError(true)}
					/>
				) : (
					<div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-[#232f48]">
						<span className="text-gray-400 dark:text-[#92a4c9] text-xs">No image</span>
					</div>
				)}

				{/* Video indicator */}
				{isVideo && (
					<div className="absolute right-2 top-2 rounded-full bg-black/40 p-1 backdrop-blur-sm">
						<Play className="h-3 w-3 text-white" fill="white" />
					</div>
				)}
			</div>

			{/* Content */}
			<div className="flex flex-col gap-2">
				{/* Title */}
				<h4 className="text-gray-900 dark:text-white text-sm font-bold leading-tight truncate">
					{item.title || 'Untitled Story'}
				</h4>

				{/* Status-specific content */}
				{status === 'draft' && (
					<div className="flex items-center justify-between">
						<span className="text-[10px] text-gray-500 dark:text-[#92a4c9] flex items-center gap-1">
							<Pencil className="h-3 w-3" />
							Edited {formatRelativeTime(item.updatedAt)}
						</span>
						<div className="flex -space-x-1.5">
							<div className="h-5 w-5 rounded-full border border-white dark:border-[#1a2234] bg-blue-600 flex items-center justify-center text-[8px] font-bold text-white">
								{initials}
							</div>
						</div>
					</div>
				)}

				{status === 'scheduled' && item.scheduledTime && (
					<div className="bg-[#2b6cee]/20 border border-[#2b6cee]/30 rounded-lg py-1.5 px-2 flex items-center gap-2">
						<Calendar className="h-3.5 w-3.5 text-[#2b6cee]" />
						<span className="text-[10px] text-[#2b6cee] font-bold">
							{formatScheduledTime(item.scheduledTime)}
						</span>
					</div>
				)}

				{status === 'processing' && (
					<div className="flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<h4 className="text-gray-900 dark:text-white text-sm font-bold truncate">{item.title || 'Processing...'}</h4>
							<span className="text-[10px] text-[#2b6cee] font-bold">--</span>
						</div>
						<div className="w-full bg-gray-100 dark:bg-[#101622] h-1.5 rounded-full overflow-hidden">
							<div className="bg-[#2b6cee] h-full w-1/2 rounded-full animate-pulse shadow-[0_0_8px_rgba(43,108,238,0.5)]" />
						</div>
						<p className="text-[10px] text-gray-500 dark:text-[#92a4c9] italic">Processing media...</p>
					</div>
				)}

				{status === 'published' && (
					<div className="flex items-center justify-between mt-1">
						<div className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400">
							<Eye className="h-3.5 w-3.5" />
							<span className="text-[10px] font-bold">
								{item.igMediaId ? 'Live' : '--'}
							</span>
						</div>
						<button
							onClick={(e) => {
								e.stopPropagation();
								// Open external link if available
							}}
							className="text-gray-400 dark:text-[#92a4c9] hover:text-gray-900 dark:hover:text-white transition-colors"
						>
							<ExternalLink className="h-3.5 w-3.5" />
						</button>
					</div>
				)}

				{status === 'failed' && (
					<div className="flex flex-col gap-2">
						<div className="bg-red-500/10 rounded-lg p-2 flex flex-col gap-1">
							<span className="text-[10px] text-red-400 font-bold flex items-center gap-1">
								<AlertCircle className="h-3.5 w-3.5" />
								Upload Failed
							</span>
							{item.error && (
								<p className="text-[9px] text-red-300/80 leading-tight truncate">
									{item.error}
								</p>
							)}
						</div>
						<button
							onClick={(e) => {
								e.stopPropagation();
								onEdit(item);
							}}
							className="w-full py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] font-bold rounded-lg transition-all border border-red-500/30"
						>
							<RefreshCw className="h-3 w-3 inline mr-1" />
							Retry Upload
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
