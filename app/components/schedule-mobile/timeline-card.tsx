'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Clock, AlertCircle, TrendingUp } from 'lucide-react';
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

const statusColors: Record<TimelineCardStatus, string> = {
	scheduled: '#3b82f6', // blue
	published: '#10b981', // green
	failed: '#ef4444', // red
	processing: '#f59e0b', // amber
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

	const statusColor = statusColors[post.publishingStatus];

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
		// For now, reschedule opens the edit modal (which includes time picker)
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
			className="relative bg-[#1a1f2e] rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group min-h-[48px]"
			style={{
				borderLeft: `4px solid ${statusColor}`,
			}}
		>
			{/* Media Thumbnail */}
			<div className="relative w-20 h-[142px] float-left mr-3">
				{post.mediaType === 'VIDEO' ? (
					<div className="w-full h-full bg-slate-800 flex items-center justify-center">
						<video
							src={post.url}
							className="w-full h-full object-cover"
							preload="metadata"
						/>
						<div className="absolute inset-0 flex items-center justify-center bg-black/20">
							<div className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
								<div className="border-t-3 border-b-3 border-l-6 border-transparent border-l-white ml-0.5" />
							</div>
						</div>
					</div>
				) : (
					<>
						{!imageError ? (
							<Image
								src={post.url}
								alt="Story preview"
								fill
								className="object-cover group-hover:scale-105 transition-transform duration-300"
								unoptimized
								onError={() => setImageError(true)}
							/>
						) : (
							<div className="w-full h-full bg-slate-800 flex items-center justify-center">
								<AlertCircle className="w-6 h-6 text-slate-500" />
							</div>
						)}
					</>
				)}
			</div>

			{/* Content */}
			<div className="p-3 pl-0">
				{/* Time Badge */}
				<div className="flex items-center gap-2 mb-2">
					<div
						data-testid="time-badge"
						className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#2b6cee]/10 rounded-lg border border-[#2b6cee]/20"
					>
						<Clock className="w-3 h-3 text-[#2b6cee]" />
						<span className="text-xs font-semibold text-[#2b6cee]">
							{timeStr}
						</span>
					</div>

					{/* Optional metadata badges */}
					{post.engagement?.predicted && (
						<div
							data-testid="engagement-badge"
							className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20"
						>
							<TrendingUp className="w-3 h-3 text-emerald-400" />
							<span className="text-xs font-semibold text-emerald-400">
								{post.engagement.predicted}%
							</span>
						</div>
					)}

					{post.warning && (
						<div
							data-testid="warning-badge"
							className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20"
						>
							<AlertCircle className="w-3 h-3 text-amber-400" />
						</div>
					)}
				</div>

				{/* Caption Preview */}
				<p
					data-testid="caption-preview"
					className="text-sm text-slate-300 line-clamp-2 leading-relaxed"
				>
					{post.caption || 'No caption'}
				</p>

				{/* Mobile Action Buttons (hidden on desktop) */}
				{onUpdate && !isDesktop && (
					<TimelineCardActions item={contentItem} onUpdate={onUpdate} />
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
