
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, CheckCircle, XCircle, Trash2, Pencil, Check, X, Plus, Minus, ZoomIn, GripVertical, BarChart3 } from 'lucide-react';
import { ScheduledPost } from '@/lib/types';
import { StatusBadge } from '../ui/status-badge';
import { MediaModal } from '../ui/media-modal';
import { InsightsPanel } from './insights-panel';

interface PostCardProps {
    post: ScheduledPost;
    onCancel: (id: string) => void;
    onReschedule: (id: string, newTime: Date) => void;
    onUpdateTags?: (id: string, tags: any[]) => void;
    isDraggable?: boolean;
}

const statusIcons = {
    pending: Clock,
    published: CheckCircle,
    failed: XCircle,
    cancelled: XCircle,
};

const statusColors = {
    pending: 'bg-white border-slate-200 hover:border-indigo-300',
    published: 'bg-emerald-50/10 border-emerald-100',
    failed: 'bg-rose-50/10 border-rose-100',
    cancelled: 'bg-slate-50 border-slate-200',
};

export function PostCard({ post, onCancel, onReschedule, onUpdateTags, isDraggable = false }: PostCardProps) {
    const [now] = useState(() => Date.now());
    const [isEditing, setIsEditing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showInsights, setShowInsights] = useState(false);

    // Edit state
    const [editDate, setEditDate] = useState(() => new Date(post.scheduledTime).toISOString().split('T')[0]);
    const [editTime, setEditTime] = useState(() => new Date(post.scheduledTime).toTimeString().slice(0, 5));
    const [editTags, setEditTags] = useState(() => (post.userTags || []).map(t => t.username).join(', '));

    // DnD Hooks
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: post.id,
        disabled: !isDraggable || isEditing
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    const StatusIcon = statusIcons[post.status];
    const colorClasses = statusColors[post.status];
    const scheduledDate = new Date(post.scheduledTime);
    const isPast = post.scheduledTime < now;

    const handleSave = () => {
        const newTime = new Date(`${editDate}T${editTime}`);
        if (isNaN(newTime.getTime())) return;

        onReschedule(post.id, newTime);

        // Handle tags update
        if (onUpdateTags) {
            const currentTags = (post.userTags || []).map(t => t.username).sort().join(',');
            const newTagsList = editTags.split(',').map(s => s.trim()).filter(s => s.length > 0).sort();
            const newTagsStr = newTagsList.join(',');

            if (currentTags !== newTagsStr) {
                const tagsPayload = newTagsList.map(username => ({
                    username,
                    x: 0.5,
                    y: 0.5
                }));
                onUpdateTags(post.id, tagsPayload);
            }
        }

        setIsEditing(false);
    };

    const adjustMinutes = (amount: number) => {
        const currentDate = new Date(`${editDate}T${editTime}`);
        if (isNaN(currentDate.getTime())) return;
        currentDate.setMinutes(currentDate.getMinutes() + amount);
        setEditDate(currentDate.toISOString().split('T')[0]);
        setEditTime(currentDate.toTimeString().slice(0, 5));
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
                    className="relative w-full aspect-square bg-slate-100 group cursor-grab active:cursor-grabbing"
                    onClick={(e) => {
                        // If it came from a drag, this click might fire. 
                        // But typically activationConstraint prevents drag from firing click.
                        // However, simple clicks should open modal.
                        setShowModal(true);
                    }}
                >
                    {/* Type Badge */}
                    <div className="absolute top-3 left-3 z-10">
                        <span className="px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                            {post.type}
                        </span>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3 z-10">
                        <StatusBadge status={post.status} />
                    </div>

                    {post.type === 'VIDEO' ? (
                        <div className="relative w-full h-full">
                            <video
                                src={post.url}
                                className="w-full h-full object-cover"
                                controls={false}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <div className="border-t-4 border-b-4 border-l-8 border-transparent border-l-white ml-1" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Image
                            src={post.url}
                            alt="Preview"
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            unoptimized
                        />
                    )}

                    {/* Zoom Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ZoomIn className="w-6 h-6 text-white drop-shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300" />
                    </div>
                </div>

                {/* Content Section - Bottom Half */}
                <div className="p-3 flex flex-col flex-1 gap-2 bg-white">
                    {/* Date/Time Row */}
                    {!isEditing ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                                    {scheduledDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                                </span>
                                <span className="text-xs font-black text-indigo-600">
                                    {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1">
                                {post.status === 'published' && post.igMediaId && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowInsights(true); }}
                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                                        title="View Insights"
                                    >
                                        <BarChart3 className="w-4 h-4" />
                                    </button>
                                )}

                                {post.status === 'pending' && !isPast && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                                        title="Reschedule"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}

                                {post.status === 'pending' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onCancel(post.id); }}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                                        title="Cancel Post"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        // Editing Mode
                        <div className="space-y-3">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        className="text-xs font-bold w-full p-2 rounded-xl border border-indigo-100 outline-none focus:border-indigo-500 bg-white"
                                    />
                                    <input
                                        type="time"
                                        value={editTime}
                                        onChange={(e) => setEditTime(e.target.value)}
                                        className="text-xs font-bold w-20 p-2 rounded-xl border border-indigo-100 outline-none focus:border-indigo-500 bg-white"
                                    />
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={editTags}
                                        onChange={(e) => setEditTags(e.target.value)}
                                        placeholder="@user1, @user2"
                                        className="text-xs w-full p-2 pr-8 rounded-xl border border-indigo-100 outline-none focus:border-indigo-500 bg-white"
                                    />
                                    {/* Helper to check first tag if exists */}
                                    {editTags.split(',')[0]?.trim() && (
                                        <a
                                            href={`https://instagram.com/${editTags.split(',')[0].trim().replace('@', '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute right-2 top-2 text-indigo-400 hover:text-indigo-600"
                                            title="Verify first user on Instagram"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ZoomIn className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 pl-1">
                                    Format: @username (public accounts only)
                                </p>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex gap-1">
                                    <button onClick={() => adjustMinutes(-1)} className="p-1 px-2 text-[10px] font-bold bg-slate-100 rounded hover:bg-rose-100 hover:text-rose-600">-1m</button>
                                    <button onClick={() => adjustMinutes(1)} className="p-1 px-2 text-[10px] font-bold bg-slate-100 rounded hover:bg-emerald-100 hover:text-emerald-600">+1m</button>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={handleSave} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm"><Check className="w-4 h-4" /></button>
                                    <button onClick={() => setIsEditing(false)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"><X className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    )}

                    {post.error && (
                        <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2">
                            <XCircle className="w-3.5 h-3.5 text-rose-500 mt-0.5" />
                            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight leading-relaxed">{post.error}</p>
                        </div>
                    )}

                    {/* Caption Preview (truncated) */}
                    {post.caption && !isEditing && (
                        <p className="text-xs text-slate-500 line-clamp-2 px-1">
                            {post.caption}
                        </p>
                    )}
                    {/* Tags Preview */}
                    {post.userTags && post.userTags.length > 0 && !isEditing && (
                        <div className="flex flex-wrap gap-1 px-1">
                            {post.userTags.map((tag, i) => (
                                <span key={i} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-medium">
                                    @{tag.username}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <MediaModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                url={post.url}
                type={post.type}
            />

            <InsightsPanel
                postId={post.id}
                isOpen={showInsights}
                onClose={() => setShowInsights(false)}
            />
        </>
    );
}
