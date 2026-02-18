'use client';

import { useState, useCallback, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Edit, Trash2, ImageOff, X, Play } from 'lucide-react';
import { ContentItem } from '@/lib/types';
import { SfAvatar, SfStatusBadge } from '@/app/components/storyflow';
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from '@/lib/utils';

/** Extract a thumbnail frame from a video URL at the given time (default 0.5s) */
async function extractThumbnailFromVideo(videoUrl: string, timeSeconds = 0.5): Promise<string | null> {
	return new Promise((resolve) => {
		const video = document.createElement('video');
		video.src = videoUrl;
		video.muted = true;
		video.crossOrigin = 'anonymous';
		video.preload = 'metadata';

		const cleanup = () => {
			video.src = '';
			video.load();
		};

		const timeout = setTimeout(() => {
			cleanup();
			resolve(null);
		}, 10_000);

		video.addEventListener('loadedmetadata', () => {
			// Seek to the requested time or 0 if video is shorter
			video.currentTime = Math.min(timeSeconds, video.duration || 0.5);
		}, { once: true });

		video.addEventListener('seeked', () => {
			clearTimeout(timeout);
			try {
				const canvas = document.createElement('canvas');
				canvas.width = video.videoWidth || 360;
				canvas.height = video.videoHeight || 640;
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					cleanup();
					resolve(null);
					return;
				}
				ctx.drawImage(video, 0, 0);
				const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
				cleanup();
				resolve(dataUrl);
			} catch {
				cleanup();
				resolve(null);
			}
		}, { once: true });

		video.addEventListener('error', () => {
			clearTimeout(timeout);
			cleanup();
			resolve(null);
		}, { once: true });
	});
}

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
	const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
	const hasValidUrl = submission.mediaUrl && !submission.mediaUrl.startsWith('blob:');
	const status = getDisplayStatus(submission);
	const isPublished = status === 'published';
	const canEdit = submission.submissionStatus === 'pending';
	const isVideo = submission.mediaType === 'VIDEO';

	// Generate thumbnail from video if not available in database
	useEffect(() => {
		if (isVideo && !submission.thumbnailUrl && submission.mediaUrl && !imageError) {
			extractThumbnailFromVideo(submission.mediaUrl)
				.then((dataUrl) => setGeneratedThumbnail(dataUrl))
				.catch(() => setImageError(true));
		}
	}, [isVideo, submission.thumbnailUrl, submission.mediaUrl, imageError]);

	// For videos, require thumbnailUrl - don't fall back to mediaUrl (video files don't render in <img>)
	const thumbnailSrc = isVideo
		? (submission.thumbnailUrl || generatedThumbnail || null)
		: submission.mediaUrl;

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
			{!imageError && hasValidUrl && thumbnailSrc ? (
				<>
					<img
						src={thumbnailSrc}
						alt={submission.title || 'Submission'}
					className="absolute inset-0 h-full w-full object-contain"
						onError={() => setImageError(true)}
					/>
					{isVideo && (
						<div className="absolute inset-0 flex items-center justify-center z-[1]">
							<div className="rounded-full bg-black/50 p-3 backdrop-blur-sm">
								<Play className="h-6 w-6 text-white" fill="white" />
							</div>
						</div>
					)}
				</>
			) : (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-100 text-gray-500">
					<ImageOff className="h-12 w-12 opacity-50" />
					<span className="text-xs">{isVideo ? 'Video thumbnail unavailable' : 'Image unavailable'}</span>
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
						className="size-11 rounded-full bg-white text-black flex items-center justify-center hover:bg-[var(--sf-primary)] hover:text-white transition-all transform hover:scale-110"
						aria-label="View"
					>
						<Eye className="h-5 w-5" />
					</button>
				) : (
					// Non-published items: view, edit, delete
					<>
						<button
							onClick={handleView}
							className="size-11 rounded-full bg-white text-black flex items-center justify-center hover:bg-[var(--sf-primary)] hover:text-white transition-all transform hover:scale-110"
							aria-label="View"
						>
							<Eye className="h-5 w-5" />
						</button>
						{canEdit && onEdit && (
							<button
								onClick={() => onEdit(submission)}
								className="size-11 rounded-full bg-white text-black flex items-center justify-center hover:bg-[var(--sf-primary)] hover:text-white transition-all transform hover:scale-110"
								aria-label="Edit"
							>
								<Edit className="h-5 w-5" />
							</button>
						)}
						{onDelete && (
							<button
								onClick={() => onDelete(submission)}
								className="size-11 rounded-full bg-white text-black flex items-center justify-center hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
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
						isVideo ? (
							<video
								src={submission.mediaUrl}
								poster={submission.thumbnailUrl}
								controls
								className="w-full max-h-[80vh]"
							/>
						) : (
							<img
								src={submission.mediaUrl}
								alt={submission.title || 'Submission'}
								className="w-full max-h-[80vh] object-contain"
							/>
						)
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
