'use client';

import { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Edit, Trash2, ImageOff, X } from 'lucide-react';
import { ContentItem } from '@/lib/types';
import { SfAvatar, SfStatusBadge } from '@/app/components/storyflow';
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from '@/lib/utils';

interface SubmissionCardProps {
	submission: ContentItem;
	onView?: (submission: ContentItem) => void;
	onEdit?: (submission: ContentItem) => void;
	onDelete?: (submission: ContentItem) => void;
	className?: string;
}

type StatusType = 'pending' | 'approved' | 'rejected' | 'published' | 'scheduled' | 'processing';

/**
 * Determines the display status from submission and publishing statuses
 */
function getDisplayStatus(submission: ContentItem): StatusType {
	// Publishing status takes precedence for active states
	if (submission.publishingStatus === 'published') return 'published';
	if (submission.publishingStatus === 'scheduled') return 'scheduled';
	if (submission.publishingStatus === 'processing') return 'processing';

	// Fall back to submission status
	if (submission.submissionStatus === 'approved') return 'approved';
	if (submission.submissionStatus === 'rejected') return 'rejected';

	return 'pending';
}

/**
 * Story card component with 9:16 aspect ratio, hover actions, and status badge.
 * Follows the StoryFlow design system.
 */
export function SubmissionCard({
	submission,
	onView,
	onEdit,
	onDelete,
	className,
}: SubmissionCardProps) {
	const [imageError, setImageError] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	const hasValidUrl = submission.mediaUrl && !submission.mediaUrl.startsWith('blob:');
	const status = getDisplayStatus(submission);
	const isPublished = status === 'published';
	const canEdit = submission.submissionStatus === 'pending';

	// Format the time text based on status
	const getTimeText = () => {
		if (status === 'published' && submission.publishedAt) {
			return `Published ${formatDistanceToNow(new Date(submission.publishedAt), { addSuffix: true })}`;
		}
		if (status === 'scheduled' && submission.scheduledTime) {
			return `Scheduled for ${new Date(submission.scheduledTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
		}
		return `Submitted ${formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true })}`;
	};

	// Extract username from email for display
	const displayName = submission.userEmail?.split('@')[0] || 'Unknown';

	const handleView = useCallback(() => {
		if (onView) {
			onView(submission);
		} else {
			setPreviewOpen(true);
		}
	}, [onView, submission]);

	return (
		<div
			className={cn(
				'group relative aspect-[9/16] rounded-xl overflow-hidden',
				'bg-black border border-gray-200',
				'hover:shadow-2xl transition-all duration-300',
				className
			)}
		>
			{/* Background Image */}
			{!imageError && hasValidUrl ? (
				<img
					src={submission.mediaUrl}
					alt={submission.title || 'Submission'}
					className="absolute inset-0 h-full w-full object-contain"
					onError={() => setImageError(true)}
				/>
			) : (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-100 text-gray-500">
					<ImageOff className="h-12 w-12 opacity-50" />
					<span className="text-xs">Image unavailable</span>
				</div>
			)}

			{/* Gradient Overlay */}
			<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

			{/* Status Badge */}
			<div className="absolute top-4 left-4">
				<SfStatusBadge status={status} size="sm" />
			</div>

			{/* Hover Actions Overlay */}
			<div
				className={cn(
					'absolute inset-0 flex items-center justify-center gap-3',
					'transition-opacity duration-300',
					// Mobile: always visible, no backdrop
					'opacity-100',
					// Desktop: hidden until hover, with backdrop
					'lg:opacity-0 lg:group-hover:opacity-100',
					'lg:bg-black/40 lg:backdrop-blur-[2px]'
				)}
			>
				{isPublished ? (
					// Published items: show view
					<button
						onClick={handleView}
						className="size-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-[var(--sf-primary)] hover:text-white transition-all transform hover:scale-110"
						aria-label="View"
					>
						<Eye className="h-5 w-5" />
					</button>
				) : (
					// Non-published items: view, edit, delete
					<>
						<button
							onClick={handleView}
							className="size-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-[var(--sf-primary)] hover:text-white transition-all transform hover:scale-110"
							aria-label="View"
						>
							<Eye className="h-5 w-5" />
						</button>
						{canEdit && onEdit && (
							<button
								onClick={() => onEdit(submission)}
								className="size-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-[var(--sf-primary)] hover:text-white transition-all transform hover:scale-110"
								aria-label="Edit"
							>
								<Edit className="h-5 w-5" />
							</button>
						)}
						{onDelete && (
							<button
								onClick={() => onDelete(submission)}
								className="size-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
								aria-label="Delete"
							>
								<Trash2 className="h-5 w-5" />
							</button>
						)}
					</>
				)}
			</div>

			{/* Footer Info */}
			<div className="absolute bottom-0 left-0 right-0 p-4">
				<div className="flex items-center gap-2 mb-1">
					<SfAvatar
						fallback={displayName}
						size="xs"
						className="border border-white/20"
					/>
					<p className="text-white text-sm font-bold truncate">
						@{displayName}
					</p>
				</div>
				<p className="text-white/60 text-[11px]">{getTimeText()}</p>
			</div>

			{/* Preview Dialog */}
			<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
				<DialogContent className="max-w-lg p-0 overflow-hidden bg-black border-none gap-0">
					<VisuallyHidden><DialogTitle>Preview</DialogTitle></VisuallyHidden>
					<button
						onClick={() => setPreviewOpen(false)}
						className="absolute right-3 top-3 z-10 size-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
						aria-label="Close"
					>
						<X className="h-4 w-4" />
					</button>
					{hasValidUrl && (
						<img
							src={submission.mediaUrl}
							alt={submission.title || 'Submission'}
							className="w-full max-h-[80vh] object-contain"
						/>
					)}
					<div className="p-4 bg-black">
						<div className="flex items-center gap-2">
							<SfStatusBadge status={status} size="sm" />
							<span className="text-white/60 text-xs">{getTimeText()}</span>
						</div>
						{submission.caption && (
							<p className="text-white text-sm mt-3 line-clamp-3">{submission.caption}</p>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

/**
 * Skeleton loading state for submission card
 */
export function SubmissionCardSkeleton() {
	return (
		<div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-white border border-gray-200 animate-pulse">
			<div className="absolute top-4 left-4">
				<div className="h-5 w-16 rounded-full bg-gray-200" />
			</div>
			<div className="absolute bottom-0 left-0 right-0 p-4">
				<div className="flex items-center gap-2 mb-2">
					<div className="h-6 w-6 rounded-full bg-gray-200" />
					<div className="h-4 w-24 rounded bg-gray-200" />
				</div>
				<div className="h-3 w-20 rounded bg-gray-200" />
			</div>
		</div>
	);
}
