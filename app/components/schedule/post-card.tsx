'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Clock, CheckCircle, XCircle, Trash2, Pencil, Check, X, Plus, Minus, ZoomIn } from 'lucide-react';
import { ScheduledPost } from '@/lib/types';
import { StatusBadge } from '../ui/status-badge';
import { MediaModal } from '../ui/media-modal';
import { InsightsPanel } from './insights-panel';
import { BarChart3 } from 'lucide-react';

interface PostCardProps {
    post: ScheduledPost;
    onCancel: (id: string) => void;
    onReschedule: (id: string, newTime: Date) => void;
}

const statusIcons = {
    pending: Clock,
    published: CheckCircle,
    failed: XCircle,
    cancelled: XCircle,
};

const statusColors = {
    pending: 'bg-indigo-50/50 border-indigo-100 text-indigo-700',
    published: 'bg-emerald-50/50 border-emerald-100 text-emerald-700',
    failed: 'bg-rose-50/50 border-rose-100 text-rose-700',
    cancelled: 'bg-slate-50 border-slate-200 text-slate-700',
};

export function PostCard({ post, onCancel, onReschedule }: PostCardProps) {
    const [now] = useState(() => Date.now());
    const [isEditing, setIsEditing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showInsights, setShowInsights] = useState(false);

    // Edit state
    const [editDate, setEditDate] = useState(() => new Date(post.scheduledTime).toISOString().split('T')[0]);
    const [editTime, setEditTime] = useState(() => new Date(post.scheduledTime).toTimeString().slice(0, 5));

    const StatusIcon = statusIcons[post.status];
    const colorClasses = statusColors[post.status];
    const scheduledDate = new Date(post.scheduledTime);
    const isPast = post.scheduledTime < now;

    const handleSave = () => {
        const newTime = new Date(`${editDate}T${editTime}`);
        if (isNaN(newTime.getTime())) return;
        onReschedule(post.id, newTime);
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
            <div className={`${colorClasses} border rounded-3xl p-5 flex items-center justify-between gap-6 transition-all duration-300 hover:shadow-md hover:border-indigo-200 group/card`}>
                <div className="flex items-center gap-6 flex-1 min-w-0">
                    <StatusIcon className={`w-6 h-6 shrink-0 opacity-40`} />

                    {/* Larger Thumbnail Preview */}
                    <div
                        onClick={() => setShowModal(true)}
                        className="w-20 h-20 rounded-2xl bg-slate-200 overflow-hidden shrink-0 border-2 border-white shadow-sm group relative cursor-zoom-in transition-transform hover:scale-105 active:scale-95"
                    >
                        {post.type === 'VIDEO' ? (
                            <div className="relative w-full h-full">
                                <video src={post.url} className="w-full h-full object-cover" controls={false} />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <div className="border-t-4 border-b-4 border-l-8 border-transparent border-l-white ml-1" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Image
                                src={post.url}
                                alt="Preview"
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        )}
                        <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-black text-slate-900 text-xs uppercase tracking-widest">{post.type}</span>
                            <StatusBadge status={post.status} />
                        </div>

                        {isEditing ? (
                            <div className="flex flex-wrap items-center gap-4 py-2">
                                <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="text-xs font-bold p-2 rounded-xl border-2 border-indigo-100 outline-none focus:border-indigo-500 bg-white"
                                />

                                <div className="flex items-center gap-1.5 p-1 bg-white border-2 border-indigo-50 rounded-xl shadow-sm">
                                    <button
                                        onClick={() => adjustMinutes(-5)}
                                        className="text-[10px] font-black w-7 h-7 flex items-center justify-center hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition"
                                        title="-5 min"
                                    >
                                        -5
                                    </button>
                                    <button
                                        onClick={() => adjustMinutes(-1)}
                                        className="w-7 h-7 flex items-center justify-center hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition"
                                        title="-1 min"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>

                                    <input
                                        type="time"
                                        value={editTime}
                                        onChange={(e) => setEditTime(e.target.value)}
                                        className="text-sm font-black outline-none w-20 text-center bg-transparent text-indigo-700"
                                    />

                                    <button
                                        onClick={() => adjustMinutes(1)}
                                        className="w-7 h-7 flex items-center justify-center hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition"
                                        title="+1 min"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => adjustMinutes(5)}
                                        className="text-[10px] font-black w-7 h-7 flex items-center justify-center hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition"
                                        title="+5 min"
                                    >
                                        +5
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                                    <button onClick={handleSave} className="p-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition shadow-lg shadow-indigo-200 active:scale-95" title="Save">
                                        <Check className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition active:scale-95" title="Cancel">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm font-bold text-slate-400 truncate mb-2 max-w-sm opacity-60 font-mono tracking-tighter transition-all group-hover/card:opacity-100">{post.url}</p>
                                <div className="flex items-center gap-3">
                                    <div className="px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center gap-2">
                                        <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                                            {scheduledDate.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </span>
                                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                                        <span className="text-xs font-black text-indigo-600">
                                            {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {post.status === 'published' && post.igMediaId && (
                                        <button
                                            onClick={() => setShowInsights(true)}
                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-1.5 shadow-sm"
                                            title="View Performance"
                                        >
                                            <BarChart3 className="w-3 h-3" />
                                            Insights
                                        </button>
                                    )}

                                    {isPast && post.status === 'pending' && (
                                        <div className="flex items-center gap-2 animate-pulse">
                                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Processing</span>
                                        </div>
                                    )}

                                    {post.status === 'pending' && !isPast && (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="p-2 hover:bg-indigo-600 hover:text-white rounded-xl transition-all text-slate-400 shadow-sm border border-transparent hover:border-indigo-100"
                                            title="Reschedule"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </>
                        )}

                        {post.error && (
                            <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-rose-500" />
                                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">Error: {post.error}</p>
                            </div>
                        )}
                    </div>
                </div>
                {post.status === 'pending' && !isEditing && (
                    <button
                        onClick={() => onCancel(post.id)}
                        className="p-3 hover:bg-rose-500 hover:text-white rounded-2xl transition-all text-rose-300 active:scale-95 border border-transparent hover:shadow-lg hover:shadow-rose-100"
                        title="Cancel"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
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
