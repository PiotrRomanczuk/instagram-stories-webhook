'use client';

import React from 'react';
import { ContentItem } from '@/lib/types/posts';
import { MediaThumbnail } from '../ui/media-thumbnail';
import {
	GripVertical,
	Calendar,
	Eye,
	ThumbsUp,
	ThumbsDown,
	Loader2,
	CheckSquare,
	Square,
} from 'lucide-react';
import { formatCreatorName } from './content-list.helpers';
import { StatusBadge } from './content-list.status-badge';
import { QuickInsights } from './content-list.quick-insights';
import { QuickRejectPopover } from './content-list.quick-reject-popover';
import { StoryPreviewHover } from './content-list.story-preview-hover';

interface ContentListRowProps {
	item: ContentItem;
	tab: 'all' | 'review' | 'queue' | 'published' | 'rejected';
	isAdmin: boolean;
	isQueueTab: boolean;
	showBulkSelection: boolean;
	isPendingSubmission: boolean;
	isSelected: boolean;
	approvingId: string | null;
	rejectingId: string | null;
	showRejectPopover: string | null;
	onToggleSelect: (id: string) => void;
	onPreview: (item: ContentItem) => void;
	onEdit: (item: ContentItem) => void;
	onQuickApprove: (itemId: string) => void;
	onShowRejectPopover: (itemId: string) => void;
	onCloseRejectPopover: () => void;
	onQuickReject: (itemId: string, reason: string) => void;
}

export function ContentListRow({
	item,
	tab,
	isAdmin,
	isQueueTab,
	showBulkSelection,
	isPendingSubmission,
	isSelected,
	approvingId,
	rejectingId,
	showRejectPopover,
	onToggleSelect,
	onPreview,
	onEdit,
	onQuickApprove,
	onShowRejectPopover,
	onCloseRejectPopover,
	onQuickReject,
}: ContentListRowProps) {
	return (
		<tr
			className={`group hover:bg-indigo-50/30 transition-colors ${
				isPendingSubmission ? 'bg-amber-50/30' : ''
			} ${isSelected ? 'bg-indigo-50' : ''}`}
		>
			{showBulkSelection && (
				<td className='px-4 py-5'>
					{isPendingSubmission ? (
						<button
							onClick={() => onToggleSelect(item.id)}
							className='p-1 hover:bg-gray-100 rounded transition-colors'
						>
							{isSelected ? (
								<CheckSquare className='h-5 w-5 text-indigo-600' />
							) : (
								<Square className='h-5 w-5 text-gray-300 group-hover:text-gray-400' />
							)}
						</button>
					) : (
						<div className='w-7' />
					)}
				</td>
			)}
			{isQueueTab && (
				<td className='px-2 py-5'>
					<div className='cursor-grab active:cursor-grabbing p-2 text-gray-300 group-hover:text-indigo-400'>
						<GripVertical className='h-5 w-5' />
					</div>
				</td>
			)}
			<td className='px-6 py-5'>
				<div className='relative group/media'>
					<MediaThumbnail
						src={item.mediaUrl}
						size="sm"
						className="ring-2 ring-transparent group-hover/media:ring-indigo-400 transition-all cursor-pointer rounded-xl"
					/>
					<StoryPreviewHover item={item} />
				</div>
			</td>
			<td className='px-6 py-5'>
				<p className='text-xs font-bold text-gray-700'>
					{formatCreatorName(item.userEmail)}
				</p>
			</td>
			<td className='px-6 py-5'>
				<StatusBadge item={item} />
			</td>
			<td className='px-6 py-5'>
				{item.scheduledTime ? (
					<div className='flex items-center gap-2'>
						<Calendar className='h-3 w-3 text-amber-500' />
						<span className='text-xs font-bold text-amber-600'>
							{new Date(item.scheduledTime).toLocaleString([], {
								dateStyle: 'short',
								timeStyle: 'short',
							})}
						</span>
					</div>
				) : (
					<span className='text-xs text-gray-400'>Not scheduled</span>
				)}
			</td>
			{tab === 'published' && (
				<td className='px-6 py-5'>
					{item.publishingStatus === 'published' && item.igMediaId ? (
						<QuickInsights contentId={item.id} />
					) : (
						<span className='text-xs text-gray-400'>-</span>
					)}
				</td>
			)}
			<td className='px-6 py-5 text-right'>
				<div className='flex justify-end gap-1 relative'>
					{isAdmin && isPendingSubmission && (
						<>
							<button
								onClick={() => onQuickApprove(item.id)}
								disabled={approvingId === item.id}
								className='p-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-emerald-600 hover:text-emerald-700 border border-emerald-200'
								title='Approve'
							>
								{approvingId === item.id ? (
									<Loader2 className='h-4 w-4 animate-spin' />
								) : (
									<ThumbsUp className='h-4 w-4' />
								)}
							</button>
							<button
								onClick={() => onShowRejectPopover(item.id)}
								className='p-2 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors text-rose-600 hover:text-rose-700 border border-rose-200'
								title='Reject'
							>
								<ThumbsDown className='h-4 w-4' />
							</button>
							<QuickRejectPopover
								isOpen={showRejectPopover === item.id}
								onClose={onCloseRejectPopover}
								onReject={(reason) => onQuickReject(item.id, reason)}
								isLoading={rejectingId === item.id}
							/>
						</>
					)}
					<button
						onClick={() => onPreview(item)}
						className='p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-indigo-600 shadow-sm border border-transparent hover:border-indigo-100'
						title='Preview'
					>
						<Eye className='h-4 w-4' />
					</button>
					{isAdmin && item.publishingStatus !== 'published' && (
						<button
							onClick={() => onEdit(item)}
							className='p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-amber-600 shadow-sm border border-transparent hover:border-amber-100'
							title='Schedule'
						>
							<Calendar className='h-4 w-4' />
						</button>
					)}
				</div>
			</td>
		</tr>
	);
}
