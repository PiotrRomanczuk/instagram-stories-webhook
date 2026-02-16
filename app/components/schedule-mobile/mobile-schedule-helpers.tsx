'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
	CheckCircle2, AlertTriangle, MoreHorizontal,
	Video, ImageIcon, Loader2, RefreshCw, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import { format, getHours, getMinutes } from 'date-fns';
import { getFriendlyError } from '@/lib/utils/friendly-error';
import { toast } from 'sonner';

export interface TimeSlot {
	hour: number;
	halfHour: boolean;
	label: string;
	items: ContentItem[];
}

export function groupByTimeSlots(items: ContentItem[]): TimeSlot[] {
	const slots = new Map<string, TimeSlot>();
	for (const item of items) {
		if (!item.scheduledTime) continue;
		const d = new Date(item.scheduledTime);
		const h = getHours(d);
		const half = getMinutes(d) >= 30;
		const key = `${h}:${half ? '30' : '00'}`;
		if (!slots.has(key)) {
			const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
			slots.set(key, { hour: h, halfHour: half, label: `${dh}:${half ? '30' : '00'} ${h < 12 ? 'AM' : 'PM'}`, items: [] });
		}
		slots.get(key)!.items.push(item);
	}
	return Array.from(slots.values()).sort((a, b) => a.hour !== b.hour ? a.hour - b.hour : (a.halfHour ? 1 : 0) - (b.halfHour ? 1 : 0));
}

export function getDayDots(items: ContentItem[]): string[] {
	const dots: string[] = [];
	if (items.some(i => i.publishingStatus === 'scheduled')) dots.push('bg-blue-500');
	if (items.some(i => i.publishingStatus === 'published')) dots.push('bg-green-500');
	if (items.some(i => i.publishingStatus === 'failed')) dots.push('bg-red-500');
	if (items.some(i => i.publishingStatus === 'processing')) dots.push('bg-gray-300');
	return dots.slice(0, 3);
}

export function friendlyError(raw: string): string {
	return getFriendlyError(raw).message;
}

export const STATUS_FILTERS = [
	{ key: 'all', label: 'All' },
	{ key: 'scheduled', label: 'Scheduled' },
	{ key: 'published', label: 'Published' },
	{ key: 'failed', label: 'Failed' },
] as const;

export function ActionSheetRetryButton({ itemId, onDone }: { itemId: string; onDone: () => void }) {
	const [loading, setLoading] = useState(false);
	return (
		<button
			onClick={async () => {
				setLoading(true);
				try {
					const res = await fetch(`/api/content/${itemId}/retry`, { method: 'POST' });
					if (res.ok) { toast.success('Post queued for retry'); onDone(); }
					else { const data = await res.json(); toast.error(data.error || 'Failed to retry'); }
				} catch { toast.error('Failed to retry'); }
				finally { setLoading(false); }
			}}
			disabled={loading}
			className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 text-sm font-semibold text-orange-600 hover:bg-orange-100 transition active:scale-[0.98] min-h-[48px] disabled:opacity-50"
		>
			{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
			Retry Post
		</button>
	);
}

export function ActionSheetDeleteButton({ itemId, onDone }: { itemId: string; onDone: () => void }) {
	const [loading, setLoading] = useState(false);
	return (
		<button
			onClick={async () => {
				setLoading(true);
				try {
					const res = await fetch(`/api/content/${itemId}`, { method: 'DELETE' });
					if (res.ok) { toast.success('Post deleted'); onDone(); }
					else { const data = await res.json(); toast.error(data.error || 'Failed to delete'); }
				} catch { toast.error('Failed to delete'); }
				finally { setLoading(false); }
			}}
			disabled={loading}
			className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 text-sm font-semibold text-red-600 hover:bg-red-50 transition active:scale-[0.98] min-h-[48px] disabled:opacity-50"
		>
			{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
			Delete Post
		</button>
	);
}

export function TimelineCard({ item, onClick, onRefresh, menuOpen, onMenuToggle }: {
	item: ContentItem; onClick: () => void; onRefresh?: () => void;
	menuOpen: boolean; onMenuToggle: (id: string) => void; onItemClick?: (item: ContentItem) => void;
}) {
	const [imgError, setImgError] = useState(false);
	const [isRetrying, setIsRetrying] = useState(false);
	const isFailed = item.publishingStatus === 'failed';
	const isPublished = item.publishingStatus === 'published';
	const time = item.scheduledTime ? format(new Date(item.scheduledTime), 'h:mm a') : '';
	const displayTitle = item.caption || item.title || `${item.mediaType === 'VIDEO' ? 'Video' : 'Image'} \u00b7 ${time}`;

	const handleRetry = async (e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			setIsRetrying(true);
			const response = await fetch(`/api/content/${item.id}/retry`, { method: 'POST' });
			if (response.ok) { toast.success('Post queued for retry'); onRefresh?.(); }
			else { const data = await response.json(); toast.error(data.error || 'Failed to retry'); }
		} catch { toast.error('Failed to retry post'); }
		finally { setIsRetrying(false); }
	};

	return (
		<div onClick={onClick} className={cn('max-w-full rounded-xl shadow-sm border p-2 flex items-center gap-2.5 overflow-hidden cursor-pointer transition active:scale-[0.98] relative', isFailed ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100')}>
			{isFailed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-xl" />}
			<div className={cn('w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg overflow-hidden shrink-0 relative', isFailed && 'ml-1')}>
				{item.mediaUrl && !imgError ? (
					<Image src={item.mediaUrl} alt={item.caption || 'Story preview'} fill className={cn('object-cover', isFailed && 'grayscale opacity-70')} unoptimized onError={() => setImgError(true)} />
				) : (
					<div className="flex h-full w-full items-center justify-center">
						{item.mediaType === 'VIDEO' ? <Video className="h-6 w-6 text-gray-400" /> : <ImageIcon className="h-6 w-6 text-gray-400" />}
					</div>
				)}
				{item.mediaType === 'VIDEO' && <div className="absolute bottom-0 left-0 w-full bg-black/50 text-[9px] text-white text-center py-0.5">Video</div>}
				{isFailed && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><AlertTriangle className="h-5 w-5 text-white" /></div>}
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-1.5 mb-0.5 min-w-0 flex-wrap">
					{time && <span className={cn('text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0', isFailed ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50')}>{time}</span>}
					<span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide shrink-0', item.publishingStatus === 'published' && 'bg-emerald-50 text-emerald-600', item.publishingStatus === 'failed' && 'bg-red-50 text-red-600', item.publishingStatus === 'processing' && 'bg-amber-50 text-amber-600', item.publishingStatus === 'scheduled' && 'bg-blue-50 text-blue-600')}>
						<span className={cn('w-1.5 h-1.5 rounded-full', item.publishingStatus === 'published' && 'bg-emerald-500', item.publishingStatus === 'failed' && 'bg-red-500', item.publishingStatus === 'processing' && 'bg-amber-500 animate-pulse', item.publishingStatus === 'scheduled' && 'bg-blue-500')} />
						{item.publishingStatus}
						{isFailed && item.retryCount !== undefined && item.retryCount > 0 && <span className="text-red-400">{'\u00b7'} {item.retryCount}x</span>}
					</span>
				</div>
				<h3 className="text-[13px] font-semibold text-gray-900 line-clamp-2 min-w-0 leading-snug mb-0.5">{displayTitle}</h3>
				<p className={cn('text-[11px] truncate max-w-full', isFailed ? 'text-red-500' : 'text-gray-400')}>
					{isFailed ? friendlyError(item.error || 'Publishing failed') : (item.mediaType === 'VIDEO' ? 'Video story' : 'Image story')}
				</p>
			</div>
			<div className="shrink-0">
				{isPublished && <CheckCircle2 className="h-5 w-5 text-green-500" />}
				{isFailed && (
					<button onClick={handleRetry} disabled={isRetrying} className="text-orange-500 hover:text-orange-600 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50" title="Retry">
						{isRetrying ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
					</button>
				)}
				{!isPublished && (
					<button onClick={(e) => { e.stopPropagation(); onMenuToggle(item.id); }} className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center">
						<MoreHorizontal className="h-5 w-5" />
					</button>
				)}
			</div>
		</div>
	);
}
