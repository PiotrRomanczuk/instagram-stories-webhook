'use client';

/**
 * Content Queue Card Component
 * 9:16 aspect ratio thumbnail with status badge, creator info, actions
 */

import { useState } from 'react';
import { ContentItem, SubmissionStatus } from '@/lib/types/posts';
import { Play, CheckSquare, Square } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

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

interface StatusBadgeProps {
	status: SubmissionStatus | 'published';
}

function StatusBadge({ status }: StatusBadgeProps) {
	const styles: Record<string, { bg: string; text: string; border: string }> = {
		pending: {
			bg: 'bg-yellow-500/20',
			text: 'text-yellow-300',
			border: 'border-yellow-500/30',
		},
		approved: {
			bg: 'bg-emerald-500/20',
			text: 'text-emerald-300',
			border: 'border-emerald-500/30',
		},
		rejected: {
			bg: 'bg-red-500/20',
			text: 'text-red-300',
			border: 'border-red-500/30',
		},
		published: {
			bg: 'bg-blue-500/20',
			text: 'text-blue-300',
			border: 'border-blue-500/30',
		},
	};

	const style = styles[status] || styles.pending;
	const label = status.charAt(0).toUpperCase() + status.slice(1);

	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-md border ${style.bg} ${style.text} ${style.border}`}
		>
			{label}
		</span>
	);
}

interface ContentQueueCardProps {
	item: ContentItem;
	isSelected: boolean;
	onSelect: (id: string) => void;
	onPreview: (item: ContentItem) => void;
	onEdit: (item: ContentItem) => void;
	onApprove?: (item: ContentItem) => void;
	isAdmin: boolean;
}

export function ContentQueueCard({
	item,
	isSelected,
	onSelect,
	onPreview,
	onEdit,
	onApprove,
	isAdmin,
}: ContentQueueCardProps) {
	const [imageError, setImageError] = useState(false);
	const creatorName = formatCreatorName(item.userEmail);
	const initials = getInitials(creatorName);
	const isVideo = item.mediaType === 'VIDEO';
	const thumbnailSrc = isVideo && item.thumbnailUrl ? item.thumbnailUrl : item.mediaUrl;
	const isPending = item.submissionStatus === 'pending';
	const isRejected = item.submissionStatus === 'rejected';

	// Determine display status
	const displayStatus = item.publishingStatus === 'published'
		? 'published'
		: item.submissionStatus || 'pending';

	return (
		<div className="group relative flex flex-col overflow-hidden rounded-xl border border-[#2a3649] bg-[#1a2332] shadow-sm transition-all hover:shadow-md hover:border-blue-500/50">
			{/* Checkbox Overlay */}
			<button
				onClick={(e) => {
					e.stopPropagation();
					onSelect(item.id);
				}}
				className="absolute left-3 top-3 z-10 opacity-0 transition-opacity group-hover:opacity-100"
			>
				{isSelected ? (
					<CheckSquare className="h-5 w-5 text-blue-500" />
				) : (
					<Square className="h-5 w-5 text-white/80 hover:text-white" />
				)}
			</button>

			{/* Thumbnail - 9:16 aspect ratio */}
			<div
				className="relative aspect-[9/16] w-full overflow-hidden bg-[#232f48] cursor-pointer"
				onClick={() => onPreview(item)}
			>
				{!imageError ? (
					<>
						<img
							src={thumbnailSrc}
							alt={item.title || 'Story thumbnail'}
							className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
							onError={() => setImageError(true)}
						/>
						{isVideo && (
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="rounded-full bg-black/50 p-2.5 backdrop-blur-sm">
									<Play className="h-5 w-5 text-white" fill="white" />
								</div>
							</div>
						)}
					</>
				) : (
					<div className="absolute inset-0 flex items-center justify-center text-[#92a4c9]">
						<span className="text-xs">Image unavailable</span>
					</div>
				)}

				{/* Gradient overlay */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />


				{/* Grayscale for rejected */}
				{isRejected && (
					<div className="absolute inset-0 bg-black/30" style={{ filter: 'grayscale(60%)' }} />
				)}

				{/* Status badge */}
				<div className="absolute bottom-0 left-0 w-full p-3">
					<StatusBadge status={displayStatus as SubmissionStatus | 'published'} />
				</div>
			</div>

			{/* Footer */}
			<div className="flex flex-col gap-2 p-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{/* Avatar */}
						<div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
							{initials}
						</div>
						<span className="text-xs font-semibold text-white truncate max-w-[80px]">
							{creatorName}
						</span>
					</div>
					<span className="text-[10px] text-[#92a4c9]">
						{formatRelativeTime(item.createdAt)}
					</span>
				</div>

				{/* Action buttons */}
				<div className="flex gap-2 mt-1">
					{isPending && isAdmin && onApprove ? (
						<>
							<button
								onClick={() => onEdit(item)}
								className="flex-1 rounded bg-[#232f48] py-1.5 text-xs font-medium text-white hover:bg-[#2f3e5c] transition-colors"
							>
								Edit
							</button>
							<button
								onClick={() => onApprove(item)}
								className="flex-1 rounded bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
							>
								Approve
							</button>
						</>
					) : isRejected ? (
						<button
							onClick={() => onPreview(item)}
							className="w-full rounded bg-[#232f48] py-1.5 text-xs font-medium text-white hover:bg-[#2f3e5c] transition-colors"
						>
							View Reason
						</button>
					) : (
						<button
							onClick={() => onPreview(item)}
							className="w-full rounded bg-[#232f48] py-1.5 text-xs font-medium text-white hover:bg-[#2f3e5c] transition-colors"
						>
							Details
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
