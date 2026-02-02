'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Edit, Trash2, BarChart3, Share2, ImageOff } from 'lucide-react';
import { ContentItem } from '@/lib/types';
import { SfAvatar, SfStatusBadge } from '@/app/components/storyflow';
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

	return (
		<div
			className={cn(
				'group relative aspect-[9/16] rounded-xl overflow-hidden',
				'bg-black border border-gray-200 dark:border-[var(--sf-border-dark)]',
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
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-100 dark:bg-[var(--sf-card-dark)] text-gray-500 dark:text-[var(--sf-text-secondary)]">
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
					'bg-black/40 backdrop-blur-[2px]',
					'opacity-0 group-hover:opacity-100 transition-opacity duration-300'
				)}
			>
				{isPublished ? (
					// Published items: show analytics and share
					<>
						<button
							onClick={() => onView?.(submission)}
							className="size-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-[var(--sf-primary)] hover:text-white transition-all transform hover:scale-110"
							aria-label="View analytics"
						>
							<BarChart3 className="h-5 w-5" />
						</button>
						<button
							className="size-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-[var(--sf-primary)] hover:text-white transition-all transform hover:scale-110"
							aria-label="Share"
						>
							<Share2 className="h-5 w-5" />
						</button>
					</>
				) : (
					// Non-published items: view, edit, delete
					<>
						<button
							onClick={() => onView?.(submission)}
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
		</div>
	);
}

/**
 * Skeleton loading state for submission card
 */
export function SubmissionCardSkeleton() {
	return (
		<div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-white dark:bg-[var(--sf-card-dark)] border border-gray-200 dark:border-[var(--sf-border-dark)] animate-pulse">
			<div className="absolute top-4 left-4">
				<div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-[var(--sf-border-dark)]" />
			</div>
			<div className="absolute bottom-0 left-0 right-0 p-4">
				<div className="flex items-center gap-2 mb-2">
					<div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-[var(--sf-border-dark)]" />
					<div className="h-4 w-24 rounded bg-gray-200 dark:bg-[var(--sf-border-dark)]" />
				</div>
				<div className="h-3 w-20 rounded bg-gray-200 dark:bg-[var(--sf-border-dark)]" />
			</div>
		</div>
	);
}
