'use client';

import React from 'react';
import Image from 'next/image';
import { Clock, Video, ImageIcon, Eye } from 'lucide-react';
import { ContentItem } from '@/lib/types/posts';
import { format } from 'date-fns';
import { ActionSheetRetryButton, ActionSheetDeleteButton } from './mobile-schedule-view.action-sheet-buttons';

interface ActionSheetProps {
	menuOpen: string | null;
	scheduledItems: ContentItem[];
	onClose: () => void;
	onReschedule: (item: ContentItem) => void;
	onItemClick?: (item: ContentItem) => void;
	onRefresh?: () => void;
}

/**
 * Bottom sheet action menu for timeline card context actions
 */
export function ActionSheet({
	menuOpen,
	scheduledItems,
	onClose,
	onReschedule,
	onItemClick,
	onRefresh,
}: ActionSheetProps) {
	if (!menuOpen) return null;

	const menuItem = scheduledItems.find(i => i.id === menuOpen);
	if (!menuItem) return null;

	const menuTime = menuItem.scheduledTime ? format(new Date(menuItem.scheduledTime), 'HH:mm') : '';
	const menuTitle = menuItem.caption || menuItem.title
		|| `${menuItem.mediaType === 'VIDEO' ? 'Video' : 'Image'} \u00b7 ${menuTime}`;

	return (
		<div className="fixed inset-0 z-[60]" onClick={onClose}>
			<div className="absolute inset-0 bg-black/40" />
			<div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto rounded-t-2xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()}>
				{/* Handle */}
				<div className="flex justify-center pt-3 pb-1">
					<div className="h-1 w-10 rounded-full bg-gray-300" />
				</div>
				{/* Item preview */}
				<div className="flex items-center gap-3 px-5 pb-3">
					<div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">
						{menuItem.mediaUrl ? (
							<Image src={menuItem.mediaUrl} alt={menuTitle} fill className="object-cover" sizes="44px" />
						) : (
							<div className="flex h-full w-full items-center justify-center">
								{menuItem.mediaType === 'VIDEO' ? <Video className="h-5 w-5 text-gray-400" /> : <ImageIcon className="h-5 w-5 text-gray-400" />}
							</div>
						)}
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-bold text-gray-900 truncate">{menuTitle}</p>
						<p className="text-xs text-gray-500">{menuTime}</p>
					</div>
				</div>
				{/* Actions - context-aware */}
				<div className="px-5 pb-3 flex flex-col gap-2">
					{menuItem.publishingStatus === 'failed' ? (
						<>
							<ActionSheetRetryButton itemId={menuItem.id} onDone={() => { onClose(); onRefresh?.(); }} />
							<button onClick={() => { onClose(); onItemClick?.(menuItem); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition active:scale-[0.98] min-h-[48px]">
								<Clock className="h-5 w-5 text-blue-500" />
								View Details
							</button>
							<ActionSheetDeleteButton itemId={menuItem.id} onDone={() => { onClose(); onRefresh?.(); }} />
						</>
					) : menuItem.publishingStatus === 'published' ? (
						<button onClick={() => { onClose(); onItemClick?.(menuItem); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition active:scale-[0.98] min-h-[48px]">
							<Eye className="h-5 w-5 text-emerald-500" />
							View Details &amp; Insights
						</button>
					) : (
						<>
							<button onClick={() => { onClose(); onReschedule(menuItem); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition active:scale-[0.98] min-h-[48px]">
								<Clock className="h-5 w-5 text-blue-500" />
								Reschedule
							</button>
							<ActionSheetDeleteButton itemId={menuItem.id} onDone={() => { onClose(); onRefresh?.(); }} />
						</>
					)}
				</div>
				{/* Dismiss button */}
				<div className="px-5 pt-1 pb-24">
					<button onClick={onClose} className="w-full py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-500 hover:bg-gray-50 transition active:scale-[0.98] min-h-[48px]">
						Close
					</button>
				</div>
			</div>
		</div>
	);
}
