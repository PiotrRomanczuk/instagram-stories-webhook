'use client';

import { useState } from 'react';
import { Check, X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

interface ReviewedItem {
	id: string;
	title: string;
	thumbnail: string;
	status: 'approved' | 'rejected';
	timestamp: Date;
}

interface ReviewHistorySidebarProps {
	history: ReviewedItem[];
	className?: string;
	onItemClick?: (item: ReviewedItem) => void;
}

export function ReviewHistorySidebar({ history, className, onItemClick }: ReviewHistorySidebarProps) {
	const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

	const handleImageError = (id: string) => {
		setImageErrors((prev) => new Set(prev).add(id));
	};

	return (
		<aside
			className={cn(
				'w-80 border-r border-slate-200 bg-slate-50 flex-col flex',
				className
			)}
		>
			{/* Header */}
			<div className="p-4 border-b border-slate-200">
				<h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
					Review History
				</h3>
			</div>

			{/* History List */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{history.length === 0 ? (
					<div className="text-center py-8">
						<p className="text-sm text-slate-500">No reviews yet</p>
						<p className="text-xs text-slate-600 mt-1">Start reviewing stories to see history</p>
					</div>
				) : (
					history.map((item) => (
						<div key={item.id} onClick={() => onItemClick?.(item)}>
							<HistoryItem
								item={item}
								hasImageError={imageErrors.has(item.id)}
								onImageError={() => handleImageError(item.id)}
							/>
						</div>
					))
				)}
			</div>

			{/* Keyboard Shortcuts */}
			<div className="p-4 bg-blue-50 mt-auto">
				<div className="flex items-center gap-2 text-slate-500 text-xs mb-3">
					<Keyboard className="h-4 w-4" />
					<span>Power User Shortcuts</span>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<ShortcutKey keyLabel="A" action="Approve" />
					<ShortcutKey keyLabel="R" action="Reject" />
					<ShortcutKey keyLabel="J" action="Next" />
					<ShortcutKey keyLabel="K" action="Previous" />
				</div>
			</div>
		</aside>
	);
}

interface HistoryItemProps {
	item: ReviewedItem;
	hasImageError: boolean;
	onImageError: () => void;
}

function HistoryItem({ item, hasImageError, onImageError }: HistoryItemProps) {
	const isApproved = item.status === 'approved';

	return (
		<div className="group flex gap-3 p-2 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
			{/* Thumbnail */}
			<div
				className={cn(
					'w-16 h-24 rounded bg-slate-200 flex-shrink-0 overflow-hidden relative',
					!isApproved && 'border-2 border-red-500/50'
				)}
			>
				{hasImageError ? (
					<div className="w-full h-full flex items-center justify-center bg-slate-300">
						<span className="text-xs text-slate-500">No image</span>
					</div>
				) : (
					<img
						src={item.thumbnail}
						alt={item.title}
						className="w-full h-full object-cover"
						onError={onImageError}
					/>
				)}
				{/* Status Badge */}
				<div
					className={cn(
						'absolute top-1 right-1 rounded-full p-0.5',
						isApproved ? 'bg-[#2b6cee]' : 'bg-red-500'
					)}
				>
					{isApproved ? (
						<Check className="h-3 w-3 text-white" />
					) : (
						<X className="h-3 w-3 text-white" />
					)}
				</div>
			</div>

			{/* Details */}
			<div className="flex flex-col justify-center min-w-0">
				<p className="text-sm font-semibold text-slate-900 truncate w-40">{item.title}</p>
				<p className="text-xs text-slate-500">
					{isApproved ? 'Approved' : 'Rejected'} {formatRelativeTime(item.timestamp)}
				</p>
			</div>
		</div>
	);
}

interface ShortcutKeyProps {
	keyLabel: string;
	action: string;
}

function ShortcutKey({ keyLabel, action }: ShortcutKeyProps) {
	return (
		<div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
			<kbd className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700">
				{keyLabel}
			</kbd>
			<span className="text-[11px] text-slate-500">{action}</span>
		</div>
	);
}
