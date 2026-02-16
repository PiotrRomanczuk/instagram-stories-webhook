'use client';

import React, { useState } from 'react';
import { ContentItem } from '@/lib/types/posts';
import {
	Clock,
	AlertTriangle,
	Info,
	RefreshCw,
	X,
	Loader2,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
} from 'lucide-react';
import { formatOverdueDuration } from './content-list-helpers';

export type SortColumn = 'creator' | 'status' | 'scheduled';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
	column: SortColumn | null;
	direction: SortDirection;
}

/**
 * Enhanced Status Badge with Error Details
 */
export function StatusBadge({ item }: { item: ContentItem }) {
	const [showDetails, setShowDetails] = useState(false);
	const [now] = useState(() => Date.now());

	const hasError = item.publishingStatus === 'failed' || item.error;
	const hasRejection =
		item.submissionStatus === 'rejected' && item.rejectionReason;
	const hasRetries = item.retryCount && item.retryCount > 0;
	const isOverdue =
		item.publishingStatus === 'scheduled' &&
		item.scheduledTime &&
		item.scheduledTime < now;

	const statusColors: Record<string, string> = {
		published: 'bg-emerald-100 text-emerald-700',
		scheduled: 'bg-amber-100 text-amber-700',
		processing: 'bg-blue-100 text-blue-700',
		failed: 'bg-rose-100 text-rose-700',
		draft: 'bg-gray-100 text-gray-600',
	};

	const submissionColors: Record<string, string> = {
		pending: 'bg-orange-100 text-orange-600',
		approved: 'bg-emerald-50 text-emerald-600',
		rejected: 'bg-rose-50 text-rose-600',
	};

	return (
		<div className="flex flex-col gap-1 relative">
			<div className="flex items-center gap-1.5">
				<span
					className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest w-fit ${statusColors[item.publishingStatus] || 'bg-gray-100 text-gray-600'}`}
				>
					{item.publishingStatus}
				</span>
				{isOverdue && (
					<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse">
						<Clock className="h-3 w-3" />
						OVERDUE {formatOverdueDuration(item.scheduledTime!)}
					</span>
				)}
				{(hasError || hasRejection) && (
					<button
						onClick={() => setShowDetails(!showDetails)}
						className={`p-1 rounded-full transition-colors ${hasError ? 'text-rose-500 hover:bg-rose-50' : 'text-amber-500 hover:bg-amber-50'}`}
						title="View details"
					>
						{hasError ? (
							<AlertTriangle className="h-3.5 w-3.5" />
						) : (
							<Info className="h-3.5 w-3.5" />
						)}
					</button>
				)}
				{hasRetries && (
					<span
						className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded text-[9px] font-bold"
						title={`${item.retryCount} retry attempt(s)`}
					>
						<RefreshCw className="h-2.5 w-2.5" />
						{item.retryCount}
					</span>
				)}
			</div>
			{item.source === 'submission' && item.submissionStatus && (
				<span
					className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase w-fit ${submissionColors[item.submissionStatus] || 'bg-gray-50 text-gray-500'}`}
				>
					{item.submissionStatus}
				</span>
			)}
			{showDetails && (hasError || hasRejection) && (
				<div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-72 animate-in fade-in zoom-in-95 duration-150">
					<button
						onClick={() => setShowDetails(false)}
						className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded"
					>
						<X className="h-3.5 w-3.5" />
					</button>
					{hasError && (
						<div className="mb-3">
							<div className="flex items-center gap-2 mb-2">
								<AlertTriangle className="h-4 w-4 text-rose-500" />
								<span className="text-xs font-black text-rose-700 uppercase tracking-wider">
									Error Details
								</span>
							</div>
							<p className="text-xs text-gray-700 bg-rose-50 rounded-lg p-3 font-mono break-words">
								{item.error || 'Publishing failed'}
							</p>
						</div>
					)}
					{hasRejection && (
						<div>
							<div className="flex items-center gap-2 mb-2">
								<Info className="h-4 w-4 text-amber-500" />
								<span className="text-xs font-black text-amber-700 uppercase tracking-wider">
									Rejection Reason
								</span>
							</div>
							<p className="text-xs text-gray-700 bg-amber-50 rounded-lg p-3">
								{item.rejectionReason}
							</p>
						</div>
					)}
					{item.publishedAt && (
						<div className="mt-3 pt-3 border-t border-gray-100">
							<p className="text-[10px] text-gray-400">
								Published:{' '}
								{new Date(item.publishedAt).toLocaleString()}
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

/**
 * Quick Reject Popover Component
 */
export function QuickRejectPopover({
	isOpen,
	onClose,
	onReject,
	isLoading,
}: {
	isOpen: boolean;
	onClose: () => void;
	onReject: (reason: string) => void;
	isLoading: boolean;
}) {
	const [reason, setReason] = useState('');
	if (!isOpen) return null;

	return (
		<div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 w-64">
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-bold text-gray-700">
					Rejection Reason
				</span>
				<button
					onClick={onClose}
					className="text-gray-400 hover:text-gray-600"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
			<textarea
				value={reason}
				onChange={(e) => setReason(e.target.value)}
				placeholder="Why reject this?"
				className="w-full p-2 text-xs border border-gray-200 rounded-lg resize-none h-16 focus:outline-none focus:ring-2 focus:ring-rose-200"
				autoFocus
			/>
			<button
				onClick={() => {
					if (reason.trim()) {
						onReject(reason);
						setReason('');
					}
				}}
				disabled={!reason.trim() || isLoading}
				className="mt-2 w-full px-3 py-2 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2"
			>
				{isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
				Reject
			</button>
		</div>
	);
}

/**
 * Sortable Column Header Component
 */
export function SortableHeader({
	label,
	column,
	currentSort,
	onSort,
	children,
}: {
	label: string;
	column: SortColumn;
	currentSort: SortConfig;
	onSort: (column: SortColumn) => void;
	children?: React.ReactNode;
}) {
	const isActive = currentSort.column === column;

	return (
		<th className="px-6 py-5 text-left">
			<button
				onClick={() => onSort(column)}
				className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-colors group"
			>
				{children}
				{label}
				<span className="ml-0.5">
					{isActive ? (
						currentSort.direction === 'asc' ? (
							<ArrowUp className="h-3 w-3 text-indigo-500" />
						) : (
							<ArrowDown className="h-3 w-3 text-indigo-500" />
						)
					) : (
						<ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
					)}
				</span>
			</button>
		</th>
	);
}
