'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Clock, AlertCircle, TrendingUp, Video, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import { TimelineCardActions } from './timeline-card-actions';
import { TimelineCardHoverOverlay } from './timeline-card-hover-overlay';
import { useMediaQuery } from '@/app/hooks/use-media-query';
import { ContentEditModal } from '../content/content-edit-modal';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { toast } from 'sonner';

export type TimelineCardStatus = 'scheduled' | 'published' | 'failed' | 'processing';

export interface TimelineCardPost {
	id: string;
	url: string;
	caption: string;
	scheduledTime: number;
	publishingStatus: TimelineCardStatus;
	mediaType?: 'IMAGE' | 'VIDEO';
	engagement?: {
		predicted?: number;
	};
	warning?: string;
}

interface TimelineCardProps {
	post: TimelineCardPost;
	item?: ContentItem; // Full ContentItem for actions
	onClick?: (post: TimelineCardPost) => void;
	onUpdate?: () => void; // Callback to refresh timeline
}

const statusConfig: Record<TimelineCardStatus, { label: string; dot: string; text: string; bg: string }> = {
	scheduled: { label: 'SCHEDULED', dot: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
	published: { label: 'PUBLISHED', dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
	failed: { label: 'FAILED', dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
	processing: { label: 'PROCESSING', dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
};

const borderColors: Record<TimelineCardStatus, string> = {
	scheduled: 'border-l-blue-500',
	published: 'border-l-emerald-500',
	failed: 'border-l-red-500',
	processing: 'border-l-amber-500',
};

export function TimelineCard({ post, item, onClick, onUpdate }: TimelineCardProps) {
	const [imageError, setImageError] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showCancelDialog, setShowCancelDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const isDesktop = useMediaQuery('(min-width: 1024px)');

	const scheduledDate = new Date(post.scheduledTime);
	const timeStr = scheduledDate.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	});

	const status = statusConfig[post.publishingStatus];
	const borderColor = borderColors[post.publishingStatus];

	const handleClick = () => {
		if (onClick) {
			onClick(post);
		}
	};

	const handleEdit = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowEditModal(true);
	};

	const handleReschedule = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowEditModal(true);
	};

	const handleCancel = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowCancelDialog(true);
	};

	const handleDelete = async () => {
		try {
			setIsDeleting(true);
			const response = await fetch(`/api/content/${contentItem.id}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to delete post');
			}

			toast.success('Post deleted successfully');
			setShowCancelDialog(false);
			if (onUpdate) {
				onUpdate();
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete post');
		} finally {
			setIsDeleting(false);
		}
	};

	const handleSave = () => {
		toast.success('Post updated successfully');
		setShowEditModal(false);
		if (onUpdate) {
			onUpdate();
		}
	};

	// Create a minimal ContentItem if not provided
	const contentItem: ContentItem = item || {
		id: post.id,
		mediaUrl: post.url,
		caption: post.caption,
		scheduledTime: post.scheduledTime,
		publishingStatus: post.publishingStatus as 'scheduled' | 'published' | 'failed' | 'processing',
		mediaType: post.mediaType || 'IMAGE',
		title: '',
		source: 'direct',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		version: 1,
		userId: '',
		userEmail: '',
	};

	const showHoverOverlay = isDesktop && isHovered && post.publishingStatus === 'scheduled';

	return (
		<div
			data-testid="timeline-card"
			data-post-id={post.id}
			data-status={post.publishingStatus}
			onClick={handleClick}
			onMouseEnter={() => isDesktop && setIsHovered(true)}
			onMouseLeave={() => isDesktop && setIsHovered(false)}
			className={cn(
				'relative flex gap-2.5 rounded-xl border-l-4 p-2.5 lg:p-3',
				'bg-white shadow-sm hover:shadow-md',
				'',
				'transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group',
				borderColor
			)}
		>
			{/* Thumbnail - responsive sizing */}
			<div className="relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
				{post.mediaType === 'VIDEO' ? (
					<div className="flex h-full w-full items-center justify-center bg-gray-100">
						<video
							src={post.url}
							className="h-full w-full object-cover"
							preload="metadata"
						/>
						<div className="absolute inset-0 flex items-center justify-center bg-black/20">
							<div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm">
								<Video className="h-3.5 w-3.5 text-white" />
							</div>
						</div>
					</div>
				) : (
					<>
						{post.url && !imageError ? (
							<Image
								src={post.url}
								alt="Story preview"
								fill
								className="object-cover transition-transform duration-300 group-hover:scale-105"
								unoptimized
								onError={() => setImageError(true)}
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center">
								<ImageIcon className="h-6 w-6 text-gray-400" />
							</div>
						)}
					</>
				)}
			</div>

			{/* Content */}
			<div className="flex min-w-0 flex-1 flex-col justify-center">
				{/* Top row: time + status */}
				<div className="mb-1.5 flex items-center gap-2">
					{/* Time badge */}
					<div
						data-testid="time-badge"
						className="inline-flex items-center gap-1 rounded-md bg-[#2b6cee]/8 px-2 py-0.5"
					>
						<Clock className="h-3 w-3 text-[#2b6cee]" />
						<span className="text-[11px] font-bold text-[#2b6cee]">
							{timeStr}
						</span>
					</div>

					{/* Compact status pill */}
					<span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold', status.text, status.bg)}>
						<span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
						{status.label}
					</span>

					{/* Warning */}
					{post.warning && (
						<AlertCircle data-testid="warning-badge" className="h-3.5 w-3.5 text-amber-500" />
					)}
				</div>

				{/* Caption */}
				<p
					data-testid="caption-preview"
					className="line-clamp-2 text-sm leading-snug text-gray-700"
				>
					{post.caption || 'No caption'}
				</p>

				{/* Engagement prediction */}
				{post.engagement?.predicted && (
					<div
						data-testid="engagement-badge"
						className="mt-1.5 inline-flex items-center gap-1 self-start text-xs text-emerald-600"
					>
						<TrendingUp className="h-3 w-3" />
						<span className="font-medium">{post.engagement.predicted}% engagement</span>
					</div>
				)}

				{/* Mobile Action Buttons (hidden on desktop) */}
				{onUpdate && !isDesktop && (
					<div className="mt-2">
						<TimelineCardActions item={contentItem} onUpdate={onUpdate} />
					</div>
				)}
			</div>

			{/* Desktop Hover Overlay */}
			{showHoverOverlay && (
				<TimelineCardHoverOverlay
					onEdit={handleEdit}
					onReschedule={handleReschedule}
					onCancel={handleCancel}
				/>
			)}

			{/* Edit Modal */}
			{showEditModal && (
				<ContentEditModal
					item={contentItem}
					onClose={() => setShowEditModal(false)}
					onSave={handleSave}
				/>
			)}

			{/* Cancel Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={showCancelDialog}
				onClose={() => setShowCancelDialog(false)}
				onConfirm={handleDelete}
				title="Cancel Scheduled Post?"
				message="This will permanently delete this scheduled post. This action cannot be undone."
				confirmLabel="Delete Post"
				cancelLabel="Keep Post"
				type="danger"
				isLoading={isDeleting}
			/>
		</div>
	);
}
