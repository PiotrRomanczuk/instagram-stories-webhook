'use client';

/**
 * Unified Content List Component
 * Displays content in grid or list view modes
 * List view includes drag handles when on queue tab
 * Quick actions for approve/reject directly in row
 */

import React, { useState } from 'react';
import { ContentItem } from '@/lib/types/posts';
import { ContentCard } from './content-card';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import {
	GripVertical,
	Calendar,
	Send,
	Eye,
	Clock,
	ThumbsUp,
	ThumbsDown,
	Loader2,
	X,
} from 'lucide-react';

/**
 * Story Preview on Hover Component
 */
function StoryPreviewHover({ item }: { item: ContentItem }) {
	return (
		<div className='absolute left-full ml-4 top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover/media:opacity-100 pointer-events-none transition-opacity duration-200'>
			<div className='relative w-[180px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-gray-900'>
				{/* Blurred Background */}
				<img
					src={item.mediaUrl}
					alt=''
					className='absolute inset-0 h-full w-full object-cover blur-2xl opacity-60 scale-125'
				/>
				{/* Main Media */}
				<img
					src={item.mediaUrl}
					alt='Story Preview'
					className='relative z-10 h-full w-full object-contain drop-shadow-lg'
				/>
				{/* Story UI Overlay */}
				<div className='absolute inset-0 z-20 p-3 flex flex-col justify-between pointer-events-none'>
					<div className='space-y-2'>
						<div className='flex gap-1 h-0.5'>
							<div className='flex-1 bg-white/60 rounded-full' />
							<div className='flex-1 bg-white/20 rounded-full' />
						</div>
						<div className='flex items-center gap-2'>
							<div className='w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5'>
								<div className='w-full h-full rounded-full bg-black flex items-center justify-center text-[6px] font-black text-white'>
									IG
								</div>
							</div>
							<span className='text-[8px] font-bold text-white drop-shadow'>
								Story Preview
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Quick Reject Popover Component
 */
function QuickRejectPopover({
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
		<div className='absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 w-64'>
			<div className='flex items-center justify-between mb-2'>
				<span className='text-xs font-bold text-gray-700'>Rejection Reason</span>
				<button onClick={onClose} className='text-gray-400 hover:text-gray-600'>
					<X className='h-4 w-4' />
				</button>
			</div>
			<textarea
				value={reason}
				onChange={(e) => setReason(e.target.value)}
				placeholder='Why reject this?'
				className='w-full p-2 text-xs border border-gray-200 rounded-lg resize-none h-16 focus:outline-none focus:ring-2 focus:ring-rose-200'
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
				className='mt-2 w-full px-3 py-2 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2'
			>
				{isLoading && <Loader2 className='h-3 w-3 animate-spin' />}
				Reject
			</button>
		</div>
	);
}

type ViewMode = 'grid' | 'list';

interface ContentListProps {
	items: ContentItem[];
	viewMode: ViewMode;
	onPreview: (item: ContentItem) => void;
	onEdit: (item: ContentItem) => void;
	onRefresh: () => void;
	isAdmin: boolean;
	tab: 'all' | 'review' | 'queue' | 'published';
}

export function ContentList({
	items,
	viewMode,
	onPreview,
	onEdit,
	onRefresh,
	isAdmin,
	tab,
}: ContentListProps) {
	const [selectedItemForPublish, setSelectedItemForPublish] =
		useState<ContentItem | null>(null);
	const [isPublishing, setIsPublishing] = useState(false);
	const [approvingId, setApprovingId] = useState<string | null>(null);
	const [rejectingId, setRejectingId] = useState<string | null>(null);
	const [showRejectPopover, setShowRejectPopover] = useState<string | null>(null);

	const handlePublishNow = async () => {
		if (!selectedItemForPublish) return;
		try {
			setIsPublishing(true);
			const response = await fetch(
				`/api/content/${selectedItemForPublish.id}/publish`,
				{
					method: 'POST',
				},
			);
			if (response.ok) {
				onRefresh();
				setSelectedItemForPublish(null);
			} else {
				const data = await response.json();
				console.error('Publish failed:', data.error);
			}
		} catch (err) {
			console.error('Failed to publish now', err);
		} finally {
			setIsPublishing(false);
		}
	};

	const handleQuickApprove = async (itemId: string) => {
		try {
			setApprovingId(itemId);
			const response = await fetch(`/api/content/${itemId}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'approve' }),
			});
			if (response.ok) {
				onRefresh();
			}
		} catch (err) {
			console.error('Failed to approve', err);
		} finally {
			setApprovingId(null);
		}
	};

	const handleQuickReject = async (itemId: string, reason: string) => {
		try {
			setRejectingId(itemId);
			const response = await fetch(`/api/content/${itemId}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
			});
			if (response.ok) {
				onRefresh();
				setShowRejectPopover(null);
			}
		} catch (err) {
			console.error('Failed to reject', err);
		} finally {
			setRejectingId(null);
		}
	};

	const isQueueTab = tab === 'queue';
	const isPendingSubmission = (item: ContentItem) =>
		item.source === 'submission' && item.submissionStatus === 'pending';

	if (viewMode === 'grid') {
		return (
			<div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
				{items.map((item) => (
					<ContentCard
						key={item.id}
						item={item}
						onPreview={() => onPreview(item)}
						onEdit={() => onEdit(item)}
						onRefresh={onRefresh}
						isAdmin={isAdmin}
						tab={tab}
					/>
				))}
			</div>
		);
	}

	// List view (with drag handles when on queue tab)
	return (
		<div className='bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden'>
			{isQueueTab && (
				<div className='p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3'>
					<Clock className='h-5 w-5 text-indigo-600' />
					<p className='text-sm font-bold text-indigo-900 leading-none'>
						Queue:{' '}
						<span className='font-medium text-indigo-700/70 ml-1'>
							Drag items to reorder publishing sequence.
						</span>
					</p>
				</div>
			)}
			<div className='overflow-x-auto'>
				<table className='w-full text-sm'>
					<thead>
						<tr className='bg-gray-50/50 border-b border-gray-100'>
							{isQueueTab && <th className='w-12 px-2 py-5'></th>}
							<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
								Media
							</th>
							<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
								Creator
							</th>
							<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
								Status
							</th>
							<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
								Scheduled
							</th>
							<th className='px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
								Actions
							</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-gray-50'>
						{items.map((item) => (
							<tr
								key={item.id}
								className={`group hover:bg-indigo-50/30 transition-colors ${
									isPendingSubmission(item) ? 'bg-amber-50/30' : ''
								}`}
							>
								{isQueueTab && (
									<td className='px-2 py-5'>
										<div className='cursor-grab active:cursor-grabbing p-2 text-gray-300 group-hover:text-indigo-400'>
											<GripVertical className='h-5 w-5' />
										</div>
									</td>
								)}
								<td className='px-6 py-5'>
									<div className='relative group/media'>
										<div className='w-12 h-12 rounded-xl overflow-hidden shadow-sm bg-gray-100 shrink-0 cursor-pointer ring-2 ring-transparent group-hover/media:ring-indigo-400 transition-all'>
											<img
												src={item.mediaUrl}
												alt=''
												className='w-full h-full object-cover'
											/>
										</div>
										<StoryPreviewHover item={item} />
									</div>
								</td>
								<td className='px-6 py-5'>
									<p className='text-xs font-bold text-gray-700'>
										{item.userEmail?.split('@')[0] || 'Unknown'}
									</p>
								</td>
								<td className='px-6 py-5'>
									<div className='flex flex-col gap-1'>
										<span
											className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest w-fit ${
												item.publishingStatus === 'published'
													? 'bg-emerald-100 text-emerald-700'
													: item.publishingStatus === 'scheduled'
														? 'bg-amber-100 text-amber-700'
														: item.publishingStatus === 'failed'
															? 'bg-rose-100 text-rose-700'
															: 'bg-gray-100 text-gray-600'
											}`}
										>
											{item.publishingStatus}
										</span>
										{item.source === 'submission' && (
											<span
												className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase w-fit ${
													item.submissionStatus === 'pending'
														? 'bg-orange-100 text-orange-600'
														: item.submissionStatus === 'approved'
															? 'bg-emerald-50 text-emerald-600'
															: 'bg-rose-50 text-rose-600'
												}`}
											>
												{item.submissionStatus}
											</span>
										)}
									</div>
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
								<td className='px-6 py-5 text-right'>
									<div className='flex justify-end gap-1 relative'>
										{/* Quick Approve/Reject for pending submissions */}
										{isAdmin && isPendingSubmission(item) && (
											<>
												<button
													onClick={() => handleQuickApprove(item.id)}
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
													onClick={() => setShowRejectPopover(item.id)}
													className='p-2 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors text-rose-600 hover:text-rose-700 border border-rose-200'
													title='Reject'
												>
													<ThumbsDown className='h-4 w-4' />
												</button>
												<QuickRejectPopover
													isOpen={showRejectPopover === item.id}
													onClose={() => setShowRejectPopover(null)}
													onReject={(reason) => handleQuickReject(item.id, reason)}
													isLoading={rejectingId === item.id}
												/>
											</>
										)}

										{/* Standard actions */}
										<button
											onClick={() => onPreview(item)}
											className='p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-indigo-600 shadow-sm border border-transparent hover:border-indigo-100'
											title='Preview'
										>
											<Eye className='h-4 w-4' />
										</button>
										{isAdmin && item.publishingStatus !== 'published' && (
											<>
												<button
													onClick={() => onEdit(item)}
													className='p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-amber-600 shadow-sm border border-transparent hover:border-amber-100'
													title='Schedule'
												>
													<Calendar className='h-4 w-4' />
												</button>
												{(item.source !== 'submission' ||
													item.submissionStatus === 'approved') && (
													<button
														onClick={() => setSelectedItemForPublish(item)}
														className='p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-emerald-600 shadow-sm border border-transparent hover:border-emerald-100'
														title='Publish Now'
													>
														<Send className='h-4 w-4' />
													</button>
												)}
											</>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<ConfirmationDialog
				isOpen={!!selectedItemForPublish}
				onClose={() => setSelectedItemForPublish(null)}
				onConfirm={handlePublishNow}
				title='Publish Content?'
				message={`This will immediately publish "${selectedItemForPublish?.title || 'this post'}" to Instagram. Let's go live!`}
				confirmLabel='Publish Now'
				type='success'
				isLoading={isPublishing}
			/>
		</div>
	);
}
