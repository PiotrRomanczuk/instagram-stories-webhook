'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, AlertTriangle, Video, ImageIcon, MoreHorizontal, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { friendlyError } from './mobile-schedule-view.helpers';

export function TimelineCard({ item, onClick, onRefresh, menuOpen: _menuOpen, onMenuToggle, onItemClick: _onItemClick }: {
	item: ContentItem;
	onClick: () => void;
	onRefresh?: () => void;
	menuOpen: boolean;
	onMenuToggle: (id: string) => void;
	onItemClick?: (item: ContentItem) => void;
}) {
	const [imgError, setImgError] = useState(false);
	const [isRetrying, setIsRetrying] = useState(false);

	const isFailed = item.publishingStatus === 'failed';
	const isPublished = item.publishingStatus === 'published';
	const isOverdue = item.publishingStatus === 'scheduled' && !!item.scheduledTime && item.scheduledTime < Date.now();
	const time = item.scheduledTime ? format(new Date(item.scheduledTime), 'HH:mm') : '';
	const displayTitle = item.caption || item.title || `${item.mediaType === 'VIDEO' ? 'Video' : 'Image'} \u00b7 ${time}`;

	const handleRetry = async (e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			setIsRetrying(true);
			const response = await fetch(`/api/content/${item.id}/retry`, { method: 'POST' });
			if (response.ok) {
				toast.success('Post queued for retry');
				onRefresh?.();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to retry');
			}
		} catch {
			toast.error('Failed to retry post');
		} finally {
			setIsRetrying(false);
		}
	};

	return (
		<div
			onClick={onClick}
			className={cn(
				'max-w-full rounded-xl shadow-sm border p-2 flex items-center gap-2.5 overflow-hidden cursor-pointer transition active:scale-[0.98] relative',
				isFailed ? 'bg-red-50 border-red-200' : isOverdue ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-gray-100'
			)}
		>
			{isFailed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-xl" />}
			{isOverdue && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-xl" />}

			<div className={cn('w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg overflow-hidden shrink-0 relative', isFailed && 'ml-1')}>
				{item.mediaUrl && !imgError ? (
					<Image src={item.mediaUrl} alt={item.caption || 'Story preview'} fill className={cn('object-cover', isFailed && 'grayscale opacity-70')} sizes="64px" onError={() => setImgError(true)} />
				) : (
					<div className="flex h-full w-full items-center justify-center">
						{item.mediaType === 'VIDEO' ? <Video className="h-6 w-6 text-gray-400" /> : <ImageIcon className="h-6 w-6 text-gray-400" />}
					</div>
				)}
				{item.mediaType === 'VIDEO' && (
					<div className="absolute bottom-0 left-0 w-full bg-black/50 text-[9px] text-white text-center py-0.5">Video</div>
				)}
				{isFailed && (
					<div className="absolute inset-0 flex items-center justify-center bg-black/20">
						<AlertTriangle className="h-5 w-5 text-white" />
					</div>
				)}
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-1.5 mb-0.5 min-w-0 flex-wrap">
					{time && (
						<span className={cn('text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0', isFailed ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50')}>
							{time}
						</span>
					)}
					<span className={cn(
						'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide shrink-0',
						item.publishingStatus === 'published' && 'bg-emerald-50 text-emerald-600',
						item.publishingStatus === 'failed' && 'bg-red-50 text-red-600',
						item.publishingStatus === 'processing' && 'bg-amber-50 text-amber-600',
						isOverdue && 'bg-amber-50 text-amber-600',
						item.publishingStatus === 'scheduled' && !isOverdue && 'bg-blue-50 text-blue-600',
					)}>
						<span className={cn('w-1.5 h-1.5 rounded-full', item.publishingStatus === 'published' && 'bg-emerald-500', item.publishingStatus === 'failed' && 'bg-red-500', item.publishingStatus === 'processing' && 'bg-amber-500 animate-pulse', isOverdue && 'bg-amber-500 animate-pulse', item.publishingStatus === 'scheduled' && !isOverdue && 'bg-blue-500')} />
						{isOverdue ? 'Overdue' : item.publishingStatus}
						{isFailed && item.retryCount !== undefined && item.retryCount > 0 && (
							<span className="text-red-400">\u00b7 {item.retryCount}x</span>
						)}
					</span>
				</div>
				<h3 className="text-[13px] font-semibold text-gray-900 line-clamp-2 min-w-0 leading-snug mb-0.5">{displayTitle}</h3>
				<p className={cn('text-[11px] truncate max-w-full', isFailed ? 'text-red-500' : 'text-gray-400')}>
					{isFailed ? friendlyError(item.error || 'Publishing failed') : isOverdue ? `Due ${formatDistanceToNow(new Date(item.scheduledTime!), { addSuffix: true })}` : (item.mediaType === 'VIDEO' ? 'Video story' : 'Image story')}
				</p>
			</div>

			<div className="shrink-0 flex items-center">
				{isPublished && <CheckCircle2 className="h-5 w-5 text-green-500" />}
				{isFailed && (
					<button onClick={handleRetry} disabled={isRetrying} className="text-orange-500 hover:text-orange-600 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50" title="Retry">
						{isRetrying ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
					</button>
				)}
				<button onClick={(e) => { e.stopPropagation(); onMenuToggle(item.id); }} className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center">
					<MoreHorizontal className="h-5 w-5" />
				</button>
			</div>
		</div>
	);
}
