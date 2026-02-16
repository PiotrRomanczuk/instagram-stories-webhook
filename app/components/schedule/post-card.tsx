'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
	Clock,
	XCircle,
	Trash2,
	Pencil,
	ZoomIn,
	BarChart3,
	Send,
	Loader,
	User,
	Copy,
	Code,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Session } from 'next-auth';
import { getUserRole } from '@/lib/auth-helpers';
import { ScheduledPostWithUser } from '@/lib/types';
import { StatusBadge } from '../ui/status-badge';
import { MediaModal } from '../ui/media-modal';
import { InsightsPanel } from './insights-panel';
import { PostEditModal } from './post-edit-modal';
import {
	ImageDimensionsBadge,
	AspectRatioOverlay,
} from '../media/image-dimensions-badge';
import { ExpandableCaption } from '../ui/expandable-caption';
import { StoryPreviewModal } from './story-preview-modal';

interface PostCardProps {
	post: ScheduledPostWithUser;
	onCancel: (id: string) => void;
	onReschedule: (
		id: string,
		newTime: Date,
		updatedPost?: { url?: string; caption?: string },
	) => void;
	onUpdateTags?: (
		id: string,
		tags: { username: string; x: number; y: number }[],
	) => void;
	onPostImmediately?: (id: string) => void;
	onDuplicate?: (post: ScheduledPostWithUser) => void;
	isDraggable?: boolean;
}

const statusColors = {
	pending: 'bg-white border-slate-200 hover:border-indigo-300',
	processing: 'bg-indigo-50/10 border-indigo-200',
	published: 'bg-emerald-50/10 border-emerald-100',
	failed: 'bg-rose-50/10 border-rose-100',
	cancelled: 'bg-slate-50 border-slate-200',
};

export function PostCard({
	post,
	onCancel,
	onReschedule,
	onUpdateTags,
	onPostImmediately,
	onDuplicate,
	isDraggable = false,
}: PostCardProps) {
	const [now] = useState(() => Date.now());
	const [showMediaModal, setShowMediaModal] = useState(false);
	const [showStoryPreview, setShowStoryPreview] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showInsights, setShowInsights] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [expandedError, setExpandedError] = useState(false);

	const { data: session } = useSession();
	const isDeveloper = session ? getUserRole(session as Session) === 'developer' : false;

	// DnD Hooks
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: post.id,
		disabled: !isDraggable,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		zIndex: isDragging ? 10 : 1,
		opacity: isDragging ? 0.5 : 1,
	};

	const colorClasses = statusColors[post.status];
	const scheduledDate = new Date(post.scheduledTime);
	const isPast = post.scheduledTime < now;

	const handleEditSave = (
		newTime: Date,
		newTags: string[],
		updatedPost?: { url?: string; caption?: string },
	) => {
		onReschedule(post.id, newTime, updatedPost);

		// Handle tags update
		if (onUpdateTags) {
			const currentTags = (post.userTags || [])
				.map((t) => t.username)
				.sort()
				.join(',');
			const newTagsStr = newTags.sort().join(',');

			if (currentTags !== newTagsStr) {
				const tagsPayload = newTags.map((username) => ({
					username,
					x: 0.5,
					y: 0.5,
				}));
				onUpdateTags(post.id, tagsPayload);
			}
		}

		setExpandedError(false);
	};

	return (
		<>
			<div
				ref={setNodeRef}
				style={style}
				// Only attach listeners to the wrapper if we want the WHOLE card to be draggable.
				// But we will attach to a specific handle or the image area to avoid button conflicts if activationConstraint isn't enough.
				// With activationConstraint: 8px, we can put it on the main div safely.
				{...attributes}
				{...listeners}
				className={`${colorClasses} group relative flex flex-col border rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
			>
				{/* Image Section - Top Half */}
				<div
					className='relative w-full aspect-square bg-slate-100 group cursor-grab active:cursor-grabbing'
					onClick={(_e) => {
						// If it came from a drag, this click might fire.
						// But typically activationConstraint prevents drag from firing click.
						// However, simple clicks should open modal.
						setShowMediaModal(true);
					}}
				>
					{/* Type Badge */}
					<div className='absolute top-3 left-3 z-10'>
						<span className='px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest rounded-lg'>
							{post.type}
						</span>
					</div>

					{/* Status Badge */}
					<div className='absolute top-3 right-3 z-10'>
						<StatusBadge status={post.status} />
					</div>

					{/* Image Dimensions Badge - Bottom Left */}
					{post.type === 'IMAGE' && (
						<div className='absolute bottom-3 left-3 z-10'>
							<ImageDimensionsBadge imageUrl={post.url} />
						</div>
					)}

					{post.type === 'VIDEO' ? (
						<div className='relative w-full h-full'>
							<video
								src={post.url}
								className='w-full h-full object-cover'
								controls={false}
							/>
							<div className='absolute inset-0 flex items-center justify-center bg-black/10'>
								<div className='w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center'>
									<div className='border-t-4 border-b-4 border-l-8 border-transparent border-l-white ml-1' />
								</div>
							</div>
						</div>
					) : (
						<>
							<Image
								src={post.url}
								alt='Preview'
								fill
								className='object-cover transition-transform duration-500 group-hover:scale-110'
								unoptimized
							/>
							{/* Aspect Ratio Overlay - shows crop/pad indicators */}
							<AspectRatioOverlay imageUrl={post.url} type={post.type} />
						</>
					)}

					{/* Zoom Overlay */}
					<div className='absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100'>
						<ZoomIn className='w-6 h-6 text-white drop-shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300' />
					</div>
				</div>

				{/* Content Section - Bottom Half */}
				<div className='p-3 flex flex-col flex-1 gap-2 bg-white'>
					{/* Date/Time Row */}
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100'>
							<Clock className='w-3.5 h-3.5 text-slate-400' />
							<span className='text-xs font-black text-slate-700 uppercase tracking-tight'>
								{scheduledDate.toLocaleDateString([], {
									day: '2-digit',
									month: '2-digit',
								})}
							</span>
							<span className='text-xs font-black text-indigo-600'>
								{scheduledDate.toLocaleTimeString([], {
									hour: '2-digit',
									minute: '2-digit',
								})}
							</span>
						</div>

						{/* User Email Badge */}
						{post.userEmail && (
							<div
								className='flex items-center gap-1.5 px-2 py-1 bg-purple-50 rounded-lg border border-purple-100'
								title={`Owner: ${post.userEmail}`}
							>
								<User className='w-3 h-3 text-purple-500' />
								<span className='text-[10px] font-bold text-purple-600 truncate max-w-[80px]'>
									{post.userEmail.split('@')[0]}
								</span>
							</div>
						)}

						{/* Action Buttons */}
						<div className='flex items-center gap-1'>
							{post.status === 'published' && post.igMediaId && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										setShowInsights(true);
									}}
									className='p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition'
									title='View Insights'
								>
									<BarChart3 className='w-4 h-4' />
								</button>
							)}

							<button
								onClick={(e) => {
									e.stopPropagation();
									setShowStoryPreview(true);
								}}
								className='p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition'
								title='Story Preview'
							>
								<ZoomIn className='w-4 h-4' />
							</button>

							{post.status === 'pending' && !isPast && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										setShowEditModal(true);
									}}
									className='p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition'
									title='Reschedule'
								>
									<Pencil className='w-4 h-4' />
								</button>
							)}

							{post.status === 'pending' && onDuplicate && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										onDuplicate(post);
									}}
									className='p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition'
									title='Duplicate Post'
								>
									<Copy className='w-4 h-4' />
								</button>
							)}

							{post.status === 'pending' && onPostImmediately && (
								<button
									onClick={async (e) => {
										e.stopPropagation();
										setIsProcessing(true);
										try {
											await onPostImmediately(post.id);
										} finally {
											setIsProcessing(false);
										}
									}}
									disabled={isProcessing}
									className='p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition disabled:opacity-50'
									title='Post Immediately'
								>
									{isProcessing ? (
										<Loader className='w-4 h-4 animate-spin' />
									) : (
										<Send className='w-4 h-4' />
									)}
								</button>
							)}

							{post.status === 'pending' && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										onCancel(post.id);
									}}
									className='p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition'
									title='Cancel Post'
								>
									<Trash2 className='w-4 h-4' />
								</button>
							)}
						</div>
					</div>

					{post.error && (
						<div
							className='p-2 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 cursor-pointer hover:bg-rose-100 transition'
							onClick={() => setExpandedError(!expandedError)}
						>
							<XCircle className='w-3.5 h-3.5 text-rose-500 mt-0.5 flex-shrink-0' />
							<p
								className={`text-[10px] font-bold text-rose-600 uppercase tracking-tight leading-relaxed ${expandedError ? '' : 'line-clamp-1'}`}
							>
								{post.error}
							</p>
						</div>
					)}

					{/* Caption Preview */}
					<div className='px-1'>
						<ExpandableCaption
							caption={post.caption || ''}
							maxLines={2}
							className='text-xs'
						/>
					</div>

					{/* Developer Info: Post ID */}
					{isDeveloper && (
						<div className='px-1 flex items-center gap-1 text-[9px] text-slate-400'>
							<Code className='h-2.5 w-2.5' />
							<span className='font-mono'>{post.id.slice(0, 8)}...</span>
						</div>
					)}

					{/* Tags Preview */}
					{post.userTags && post.userTags.length > 0 && (
						<div className='flex flex-wrap gap-1 px-1'>
							{post.userTags.map((tag, i) => (
								<span
									key={i}
									className='text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-medium'
								>
									@{tag.username}
								</span>
							))}
						</div>
					)}
				</div>
			</div>

			<MediaModal
				isOpen={showMediaModal}
				onClose={() => setShowMediaModal(false)}
				url={post.url}
				type={post.type}
			/>

			<PostEditModal
				isOpen={showEditModal}
				onClose={() => setShowEditModal(false)}
				post={post}
				onSave={handleEditSave}
			/>

			<InsightsPanel
				postId={post.id}
				isOpen={showInsights}
				onClose={() => setShowInsights(false)}
			/>

			<StoryPreviewModal
				isOpen={showStoryPreview}
				onClose={() => setShowStoryPreview(false)}
				post={post}
			/>
		</>
	);
}
