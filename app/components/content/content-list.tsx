'use client';

/**
 * Unified Content List Component
 * Displays content in different view modes (grid, list, queue)
 */

import React, { useState } from 'react';
import { ContentItem } from '@/lib/types/posts';
import { ContentCard } from './content-card';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { MoreHorizontal, Calendar, Send, Eye, Clock } from 'lucide-react';

type ViewMode = 'grid' | 'list' | 'queue';

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

	if (viewMode === 'list') {
		return (
			<div className='bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden'>
				<div className='overflow-x-auto'>
					<table className='w-full text-sm'>
						<thead>
							<tr className='bg-gray-50/50 border-b border-gray-100'>
								<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
									Content
								</th>
								<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
									Status
								</th>
								<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
									Created
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
									className='group hover:bg-indigo-50/30 transition-colors'
								>
									<td className='px-6 py-5'>
										<div className='flex items-center gap-4'>
											<div className='w-12 h-12 rounded-xl overflow-hidden shadow-sm bg-gray-100 shrink-0'>
												<img
													src={item.mediaUrl}
													alt=''
													className='w-full h-full object-cover'
												/>
											</div>
											<div className='min-w-0'>
												<p className='font-bold text-gray-900 truncate max-w-[200px]'>
													{item.title || 'Untitled Post'}
												</p>
												<p className='text-[10px] text-gray-400 font-bold truncate max-w-[200px]'>
													{item.caption?.substring(0, 40)}...
												</p>
											</div>
										</div>
									</td>
									<td className='px-6 py-5'>
										<span
											className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${
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
									</td>
									<td className='px-6 py-5'>
										<p className='text-xs font-bold text-gray-500'>
											{new Date(item.createdAt).toLocaleDateString()}
										</p>
									</td>
									<td className='px-6 py-5 text-right'>
										<div className='flex justify-end gap-2'>
											<button
												onClick={() => onPreview(item)}
												className='p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-indigo-600 shadow-sm border border-transparent hover:border-indigo-100'
											>
												<Eye className='h-4 w-4' />
											</button>
											{isAdmin && item.publishingStatus !== 'published' && (
												<>
													<button
														onClick={() => onEdit(item)}
														className='p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-amber-600 shadow-sm border border-transparent hover:border-amber-100'
													>
														<Calendar className='h-4 w-4' />
													</button>
													{(item.source !== 'submission' ||
														item.submissionStatus === 'approved') && (
														<button
															onClick={() => setSelectedItemForPublish(item)}
															className='p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-emerald-600 shadow-sm border border-transparent hover:border-emerald-100'
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

	if (viewMode === 'queue') {
		return (
			<div className='space-y-4'>
				<div className='p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3'>
					<Clock className='h-5 w-5 text-indigo-600' />
					<p className='text-sm font-bold text-indigo-900 leading-none'>
						Reorder Queue:{' '}
						<span className='font-medium text-indigo-700/70 ml-1'>
							Drag items to update publishing sequence.
						</span>
					</p>
				</div>
				{items.map((item, index) => (
					<div
						key={item.id}
						className='group flex items-center gap-4 rounded-3xl border border-gray-100 bg-white p-5 hover:bg-indigo-50/30 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300'
					>
						<div className='cursor-grab active:cursor-grabbing p-2 text-gray-300 group-hover:text-indigo-400'>
							<MoreHorizontal className='h-5 w-5 rotate-90' />
						</div>
						<div className='w-16 h-16 rounded-2xl overflow-hidden shadow-sm bg-gray-100 shrink-0'>
							<img
								src={item.mediaUrl}
								alt=''
								className='w-full h-full object-cover transition-transform group-hover:scale-110'
							/>
						</div>
						<div className='flex-1 min-w-0'>
							<div className='font-black text-gray-900 group-hover:text-indigo-600 transition-colors truncate'>
								{item.title || 'In Queue...'}
							</div>
							<div className='flex items-center gap-2 mt-1'>
								<Calendar className='h-3 w-3 text-amber-500' />
								<span className='text-[10px] font-black text-amber-600 uppercase tracking-widest'>
									{item.scheduledTime &&
										new Date(item.scheduledTime).toLocaleString([], {
											dateStyle: 'medium',
											timeStyle: 'short',
										})}
								</span>
							</div>
						</div>
						<button
							onClick={() => onPreview(item)}
							className='px-4 py-2 bg-gray-50 text-gray-400 hover:bg-indigo-600 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm'
						>
							Preview
						</button>
					</div>
				))}
			</div>
		);
	}

	return null;
}
