'use client';

import { useEffect } from 'react';
import {
	X,
	ChevronLeft,
	ChevronRight,
	CheckCircle,
	XCircle,
	Calendar,
	Send,
	Clock,
	User,
	AlertCircle,
} from 'lucide-react';
import Image from 'next/image';
import { MemeSubmission } from '@/lib/types/posts';
import { toast } from 'sonner';

interface MemePreviewModalProps {
	isOpen: boolean;
	meme: MemeSubmission | null;
	memes: MemeSubmission[];
	currentIndex: number;
	onClose: () => void;
	onNavigate: (index: number) => void;
	onAction: (id: string, action: 'approve' | 'reject' | 'schedule') => void;
	isAdmin: boolean;
}

export function MemePreviewModal({
	isOpen,
	meme,
	memes,
	currentIndex,
	onClose,
	onNavigate,
	onAction,
	isAdmin,
}: MemePreviewModalProps) {
	// Keyboard navigation
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
			if (e.key === 'ArrowLeft' && currentIndex > 0) {
				onNavigate(currentIndex - 1);
			}
			if (e.key === 'ArrowRight' && currentIndex < memes.length - 1) {
				onNavigate(currentIndex + 1);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, currentIndex, memes.length, onClose, onNavigate]);

	if (!isOpen || !meme) return null;

	const canGoNext = currentIndex < memes.length - 1;
	const canGoPrev = currentIndex > 0;

	const formatDate = (dateString?: string) => {
		if (!dateString) return 'Unknown date';
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const getStatusColor = (status: string) => {
		const colors: Record<string, string> = {
			pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
			approved: 'bg-blue-100 text-blue-800 border-blue-200',
			rejected: 'bg-red-100 text-red-800 border-red-200',
			published: 'bg-green-100 text-green-800 border-green-200',
			scheduled: 'bg-indigo-100 text-indigo-800 border-indigo-200',
		};
		return colors[status] || 'bg-slate-100 text-slate-800 border-slate-200';
	};

	const getStatusIcon = (status: string) => {
		const icons: Record<string, React.ReactNode> = {
			pending: <AlertCircle className='w-4 h-4' />,
			approved: <CheckCircle className='w-4 h-4' />,
			rejected: <XCircle className='w-4 h-4' />,
			published: <CheckCircle className='w-4 h-4' />,
			scheduled: <Clock className='w-4 h-4' />,
		};
		return icons[status] || null;
	};

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200'>
			<div className='w-full max-w-6xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex animate-in zoom-in-95 duration-200'>
				{/* Close Button */}
				<button
					onClick={onClose}
					className='absolute top-4 right-4 z-10 p-2 bg-white rounded-full hover:bg-slate-100 transition-colors shadow-lg'
					aria-label='Close preview'
				>
					<X className='w-6 h-6 text-slate-600' />
				</button>

				{/* Left Side: Media Preview */}
				<div className='flex-1 bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden min-w-0'>
					{/* Instagram Story Mockup Frame */}
					<div className='relative w-80 h-[600px] bg-black rounded-3xl border-8 border-black shadow-2xl flex flex-col overflow-hidden'>
						{/* Phone notch */}
						<div className='absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-20' />

						{/* Story content */}
						<div className='flex-1 relative overflow-hidden'>
							<Image
								src={meme.media_url}
								alt={meme.title || 'Meme'}
								fill
								className='object-cover'
								unoptimized
							/>
							{/* Gradient overlay for text readability */}
							<div className='absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent' />
						</div>

						{/* Story info at bottom */}
						<div className='absolute bottom-0 left-0 right-0 p-4 text-white'>
							<p className='text-xs font-medium opacity-80'>Instagram Story Preview</p>
						</div>
					</div>

					{/* Navigation arrows */}
					{canGoPrev && (
						<button
							onClick={() => onNavigate(currentIndex - 1)}
							className='absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full transition-colors'
							aria-label='Previous meme'
						>
							<ChevronLeft className='w-6 h-6 text-slate-900' />
						</button>
					)}
					{canGoNext && (
						<button
							onClick={() => onNavigate(currentIndex + 1)}
							className='absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full transition-colors'
							aria-label='Next meme'
						>
							<ChevronRight className='w-6 h-6 text-slate-900' />
						</button>
					)}

					{/* Page indicator */}
					<div className='absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-medium text-white bg-black/40 px-3 py-1 rounded-full'>
						{currentIndex + 1} / {memes.length}
					</div>
				</div>

				{/* Right Side: Details */}
				<div className='w-full md:w-96 bg-white overflow-y-auto border-l border-slate-200 flex flex-col'>
					{/* Metadata Section */}
					<div className='p-6 border-b border-slate-200 space-y-4'>
						{/* Status Badge */}
						<div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${getStatusColor(meme.status)}`}>
							{getStatusIcon(meme.status)}
							{meme.status.charAt(0).toUpperCase() + meme.status.slice(1)}
						</div>

						{/* Title */}
						{meme.title && (
							<div>
								<p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1'>
									Title
								</p>
								<p className='text-lg font-bold text-slate-900'>{meme.title}</p>
							</div>
						)}

						{/* User Info */}
						<div className='flex items-center gap-3 p-3 bg-slate-50 rounded-xl'>
							<div className='w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0'>
								<User className='w-5 h-5 text-white' />
							</div>
							<div className='min-w-0'>
								<p className='text-xs font-bold text-slate-500 uppercase tracking-wide'>
									Submitted by
								</p>
								<p className='text-sm font-bold text-slate-900 truncate'>
									{meme.user_email}
								</p>
							</div>
						</div>
					</div>

					{/* Caption Section */}
					<div className='p-6 border-b border-slate-200'>
						<p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-2'>
							Caption
						</p>
						<p className='text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words'>
							{meme.caption || 'No caption provided'}
						</p>
					</div>

					{/* Timeline/History Section */}
					<div className='p-6 border-b border-slate-200'>
						<p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-3'>
							Timeline
						</p>
						<div className='space-y-3 text-sm'>
							{/* Submission */}
							<div className='flex gap-3'>
								<Clock className='w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5' />
								<div>
									<p className='font-bold text-slate-900'>Submitted</p>
									<p className='text-xs text-slate-500'>
										{formatDate(meme.created_at)}
									</p>
								</div>
							</div>

							{/* Review Status */}
							{meme.reviewed_at && (
								<div className='flex gap-3'>
									<CheckCircle className='w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5' />
									<div>
										<p className='font-bold text-slate-900'>
											{meme.status === 'rejected' ? 'Rejected' : 'Reviewed'}
										</p>
										<p className='text-xs text-slate-500'>
											{formatDate(meme.reviewed_at)}
										</p>
										{meme.rejection_reason && (
											<p className='text-xs text-red-600 mt-1 font-medium'>
												Reason: {meme.rejection_reason}
											</p>
										)}
									</div>
								</div>
							)}

							{/* Scheduled */}
							{meme.scheduled_time && (
								<div className='flex gap-3'>
									<Calendar className='w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5' />
									<div>
										<p className='font-bold text-slate-900'>Scheduled</p>
										<p className='text-xs text-slate-500'>
											{formatDate(
												new Date(meme.scheduled_time).toISOString()
											)}
										</p>
									</div>
								</div>
							)}

							{/* Published */}
							{meme.published_at && (
								<div className='flex gap-3'>
									<Send className='w-4 h-4 text-green-600 flex-shrink-0 mt-0.5' />
									<div>
										<p className='font-bold text-slate-900'>Published</p>
										<p className='text-xs text-slate-500'>
											{formatDate(meme.published_at)}
										</p>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Quick Actions (Admin only) */}
					{isAdmin && meme.status === 'pending' && (
						<div className='p-6 border-t border-slate-200 space-y-3 mt-auto'>
							<button
								onClick={() => {
									onAction(meme.id!, 'approve');
									onClose();
									toast.success('Meme approved');
								}}
								className='w-full px-4 py-2.5 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2'
							>
								<CheckCircle className='w-4 h-4' />
								Approve
							</button>
							<button
								onClick={() => {
									onAction(meme.id!, 'reject');
									onClose();
									toast.success('Meme rejected');
								}}
								className='w-full px-4 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2'
							>
								<XCircle className='w-4 h-4' />
								Reject
							</button>
						</div>
					)}

					{/* Schedule Action (for approved/user view) */}
					{meme.status === 'approved' && !isAdmin && (
						<div className='p-6 border-t border-slate-200 mt-auto'>
							<button
								onClick={() => {
									onAction(meme.id!, 'schedule');
									onClose();
								}}
								className='w-full px-4 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2'
							>
								<Calendar className='w-4 h-4' />
								Schedule
							</button>
						</div>
					)}

					{/* Info for published/scheduled */}
					{(meme.status === 'published' || meme.status === 'scheduled') && (
						<div className='p-6 border-t border-slate-200 mt-auto bg-indigo-50'>
							<div className='flex items-center gap-2 text-indigo-700 text-sm'>
								<Clock className='w-4 h-4' />
								<span className='font-bold'>
									{meme.status === 'published'
										? 'Published to Instagram'
										: 'Scheduled for publishing'}
								</span>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
