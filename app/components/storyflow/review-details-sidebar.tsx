'use client';

import { useState } from 'react';
import { Camera, User, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types';

interface ReviewDetailsSidebarProps {
	item: ContentItem | null;
	reviewedCount: number;
	dailyGoal: number;
	progressPercent: number;
	remainingCount: number;
	reviewComment: string;
	onReviewCommentChange: (comment: string) => void;
	className?: string;
}

export function ReviewDetailsSidebar({
	item,
	reviewedCount,
	dailyGoal,
	progressPercent,
	remainingCount,
	reviewComment,
	onReviewCommentChange,
	className,
}: ReviewDetailsSidebarProps) {
	const [showCommentInput, setShowCommentInput] = useState(false);

	// Calculate circle progress
	const radius = 58;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

	// Extract author info from item
	const authorName = item?.userEmail?.split('@')[0] || 'Unknown';
	const authorRole = 'Content Creator';

	// Format scheduled time
	const scheduledTime = item?.scheduledTime
		? format(new Date(item.scheduledTime), 'MMM d, h:mm a')
		: 'Not scheduled';

	// Media type display
	const mediaTypeDisplay = item?.mediaType === 'VIDEO'
		? `Video (${item.dimensions?.height || '?'}p)`
		: 'Image';

	return (
		<aside
			className={cn(
				'w-80 border-l border-slate-200 bg-slate-50 flex-col hidden lg:flex',
				className
			)}
		>
			{/* Daily Goal Circular Gauge */}
			<div className="p-6 border-b border-slate-200 flex flex-col items-center">
				<h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 self-start">
					Daily Goal
				</h3>
				<div className="relative w-32 h-32">
					<svg className="w-full h-full -rotate-90">
						{/* Background Circle */}
						<circle
							className="text-slate-200"
							cx="64"
							cy="64"
							fill="transparent"
							r={radius}
							stroke="currentColor"
							strokeWidth="8"
						/>
						{/* Progress Circle */}
						<circle
							className="text-[#2b6cee] transition-all duration-500"
							cx="64"
							cy="64"
							fill="transparent"
							r={radius}
							stroke="currentColor"
							strokeDasharray={circumference}
							strokeDashoffset={strokeDashoffset}
							strokeWidth="8"
							strokeLinecap="round"
						/>
					</svg>
					<div className="absolute inset-0 flex flex-col items-center justify-center">
						<span className="text-2xl font-bold text-slate-900 leading-none">{progressPercent}%</span>
						<span className="text-[10px] text-slate-500 uppercase font-bold">Progress</span>
					</div>
				</div>
				<p className="mt-4 text-sm text-slate-900 font-medium">
					{reviewedCount}/{dailyGoal} Stories Reviewed
				</p>
				<p className="text-xs text-slate-500 mt-1">
					{remainingCount} stories remaining in queue
				</p>
			</div>

			{/* Story Metadata */}
			<div className="p-6 space-y-6 flex-1 overflow-y-auto">
				{/* Author Section */}
				<div>
					<h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
						Author
					</h3>
					<div className="flex items-center gap-3 p-3 bg-slate-100 rounded-lg">
						<div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center">
							<User className="h-5 w-5 text-slate-500" />
						</div>
						<div>
							<p className="text-sm font-bold text-slate-900 capitalize">{authorName}</p>
							<p className="text-xs text-slate-500">{authorRole}</p>
						</div>
					</div>
				</div>

				{/* Details Section */}
				<div>
					<h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
						Details
					</h3>
					<div className="space-y-3">
						<DetailRow label="Scheduled" value={scheduledTime} />
						<DetailRow
							label="Platform"
							value={
								<div className="flex items-center gap-1">
									<Camera className="h-4 w-4" />
									<span className="font-medium">Instagram</span>
								</div>
							}
						/>
						<DetailRow label="Type" value={mediaTypeDisplay} />
						{item?.hashtags && item.hashtags.length > 0 && (
							<DetailRow
								label="Tags"
								value={
									<span className="px-2 py-0.5 bg-[#2b6cee]/20 text-[#2b6cee] text-[10px] rounded font-bold">
										{item.hashtags.length} HASHTAGS
									</span>
								}
							/>
						)}
					</div>
				</div>

				{/* Caption Preview */}
				{item?.caption && (
					<div>
						<h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
							Caption
						</h3>
						<div className="p-3 bg-slate-100 rounded-lg">
							<p className="text-sm text-slate-600 line-clamp-4">{item.caption}</p>
						</div>
					</div>
				)}

				{/* Review Comment Section */}
				<div className="pt-4 border-t border-slate-200">
					{showCommentInput ? (
						<div className="space-y-2">
							<label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
								Review Comment
							</label>
							<textarea
								value={reviewComment}
								onChange={(e) => onReviewCommentChange(e.target.value)}
								placeholder="Add notes about this review..."
								className={cn(
									'w-full min-h-[80px] p-3 rounded-lg resize-none',
									'bg-white border border-slate-200',
									'text-slate-900 placeholder:text-slate-400 text-sm',
									'focus:outline-none focus:ring-2 focus:ring-[#2b6cee]/50 focus:border-[#2b6cee]'
								)}
							/>
							<button
								onClick={() => setShowCommentInput(false)}
								className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
							>
								Cancel
							</button>
						</div>
					) : (
						<button
							onClick={() => setShowCommentInput(true)}
							className={cn(
								'w-full flex items-center justify-center gap-2',
								'bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm transition-colors'
							)}
						>
							<MessageSquare className="h-4 w-4" />
							<span>Add Review Comment</span>
						</button>
					)}
				</div>
			</div>
		</aside>
	);
}

interface DetailRowProps {
	label: string;
	value: React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
	return (
		<div className="flex justify-between items-center text-sm">
			<span className="text-slate-500">{label}:</span>
			<span className="text-slate-900">{value}</span>
		</div>
	);
}
