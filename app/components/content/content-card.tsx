'use client';

import React, { useState } from 'react';
import { ContentItem } from '@/lib/types/posts';
import {
	MoreVertical,
	Calendar,
	Clock,
	User,
	Send,
	ChevronRight,
	Eye,
} from 'lucide-react';
import { ConfirmationDialog } from '../ui/confirmation-dialog';

/**
 * Format creator name - handles UUID fallback gracefully
 */
function formatCreatorName(userEmail?: string): string {
	if (!userEmail) return 'Unknown';
	const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (uuidPattern.test(userEmail)) return 'Unknown';
	return userEmail.split('@')[0] || 'Unknown';
}

interface ContentCardProps {
	item: ContentItem;
	onPreview: () => void;
	onEdit: () => void;
	onRefresh: () => void;
	isAdmin: boolean;
	tab: 'all' | 'review' | 'queue' | 'published' | 'rejected';
}

export function ContentCard({
	item,
	onPreview,
	onEdit,
	onRefresh,
	isAdmin,
	tab,
}: ContentCardProps) {
	const [showConfirmPublish, setShowConfirmPublish] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);

	const handlePublishNow = async () => {
		try {
			setIsPublishing(true);
			const response = await fetch(`/api/content/${item.id}/publish`, {
				method: 'POST',
			});
			if (response.ok) {
				onRefresh();
				setShowConfirmPublish(false);
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

	const statusColors = {
		published: 'bg-emerald-500/90 text-white',
		scheduled: 'bg-amber-500/90 text-white',
		failed: 'bg-rose-500/90 text-white',
		draft: 'bg-gray-500/90 text-white',
		processing: 'bg-indigo-500/90 text-white',
	};

	return (
		<div className='group relative bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col'>
			{/* Media Section */}
			<div className='relative h-60 overflow-hidden'>
				<img
					src={item.mediaUrl}
					alt={item.title || 'Post Media'}
					className='h-full w-full object-cover transition-transform duration-700 group-hover:scale-110'
					onError={(e) => {
						const target = e.target as HTMLImageElement;
						if (target.src.includes('placeholder.svg')) return;
						target.src = '/placeholder.svg';
					}}
				/>
				<div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500' />

				{/* Badges */}
				<div className='absolute top-4 left-4 flex gap-2'>
					<span
						className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md ${statusColors[item.publishingStatus as keyof typeof statusColors] || 'bg-gray-500/90'}`}
					>
						{item.publishingStatus}
					</span>
				</div>

				<div className='absolute top-4 right-4'>
					<button className='p-2 bg-white/20 backdrop-blur-xl border border-white/20 rounded-xl text-white hover:bg-white/40 transition-all active:scale-90'>
						<MoreVertical className='h-4 w-4' />
					</button>
				</div>

				{/* Quick Actions Hover Reveal */}
				<div className='absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0'>
					<button
						onClick={onPreview}
						className='p-4 bg-white text-gray-900 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all font-black'
					>
						<Eye className='h-5 w-5' />
					</button>
					{isAdmin &&
						item.publishingStatus !== 'published' &&
						(item.source !== 'submission' ||
							item.submissionStatus === 'approved') && (
							<button
								onClick={() => setShowConfirmPublish(true)}
								className='p-4 bg-emerald-500 text-white rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all'
							>
								<Send className='h-5 w-5' />
							</button>
						)}
				</div>
			</div>

			{/* Info Section */}
			<div className='p-6 flex-1 flex flex-col'>
				<div className='flex-1'>
					<div className='flex items-center gap-2 mb-2'>
						<span className='w-2 h-2 rounded-full bg-indigo-500' />
						<p className='text-[10px] font-black text-gray-400 uppercase tracking-widest'>
							{item.source}
						</p>
					</div>
					<h3 className='text-xl font-black text-gray-900 leading-tight mb-2 group-hover:text-indigo-600 transition-colors truncate'>
						{item.title || 'Creative Masterpiece'}
					</h3>
					{item.caption && (
						<p className='text-sm text-gray-500 line-clamp-2 font-medium leading-relaxed mb-4'>
							{item.caption}
						</p>
					)}
				</div>

				{/* Metadata Cards */}
				<div className='flex flex-wrap gap-2 mb-6'>
					<div className='flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100'>
						<User className='h-3 w-3 text-indigo-400' />
						<span className='text-[10px] font-bold text-gray-500'>
							{formatCreatorName(item.userEmail)}
						</span>
					</div>
					<div className='flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100'>
						<Calendar className='h-3 w-3 text-emerald-400' />
						<span className='text-[10px] font-bold text-gray-500'>
							{new Date(item.createdAt).toLocaleDateString()}
						</span>
					</div>
					{item.scheduledTime && (
						<div className='flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100'>
							<Clock className='h-3 w-3 text-amber-500' />
							<span className='text-[10px] font-black text-amber-600'>
								{new Date(item.scheduledTime).toLocaleTimeString([], {
									hour: '2-digit',
									minute: '2-digit',
								})}
							</span>
						</div>
					)}
				</div>

				{/* Primary CTA */}
				<button
					onClick={onPreview}
					className='w-full h-12 flex items-center justify-between px-6 bg-gray-950 text-white rounded-2xl hover:bg-indigo-600 transition-all duration-300 group/btn'
				>
					<span className='text-xs font-black uppercase tracking-widest'>
						View Details
					</span>
					<ChevronRight className='h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform' />
				</button>
			</div>

			<ConfirmationDialog
				isOpen={showConfirmPublish}
				onClose={() => setShowConfirmPublish(false)}
				onConfirm={handlePublishNow}
				title='Ready to Publish?'
				message="This bypasses any scheduled time and reveals this masterpiece to the world immediately. Let's do it!"
				confirmLabel='Go Live Now'
				type='success'
				isLoading={isPublishing}
			/>
		</div>
	);
}
