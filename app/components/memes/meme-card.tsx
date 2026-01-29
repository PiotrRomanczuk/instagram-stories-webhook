'use client';

import Image from 'next/image';
import { Clock, CheckCircle2, AlertCircle, Calendar, Info, Edit2, Trash2 } from 'lucide-react';
import { MemeSubmission } from '@/lib/types';
import { ExpandableCaption } from '../ui/expandable-caption';

interface MemeCardProps {
    meme: MemeSubmission;
    onEdit?: (meme: MemeSubmission) => void;
    onDelete?: (id: string) => void;
    onPreview?: (meme: MemeSubmission) => void;
}

export function MemeCard({ meme, onEdit, onDelete, onPreview }: MemeCardProps) {
    const statusConfig = {
        pending: {
            color: 'text-amber-600 bg-amber-50 border-amber-100',
            icon: <Clock className="w-3 h-3" />,
            label: 'Pending Review'
        },
        approved: {
            color: 'text-green-600 bg-green-50 border-green-100',
            icon: <CheckCircle2 className="w-3 h-3" />,
            label: 'Approved'
        },
        rejected: {
            color: 'text-red-600 bg-red-50 border-red-100',
            icon: <AlertCircle className="w-3 h-3" />,
            label: 'Rejected'
        },
        scheduled: {
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            icon: <Calendar className="w-3 h-3" />,
            label: 'Scheduled'
        },
        published: {
            color: 'text-blue-600 bg-blue-50 border-blue-100',
            icon: <CheckCircle2 className="w-3 h-3" />,
            label: 'Published'
        }
    };

    const config = statusConfig[meme.status as keyof typeof statusConfig] || statusConfig.pending;
    const isVideo = meme.media_url.toLowerCase().endsWith('.mp4');

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
            {/* Media Preview */}
            <button
                onClick={() => onPreview?.(meme)}
                className="relative w-full aspect-square bg-slate-100 overflow-hidden cursor-pointer border-0 p-0 hover:bg-slate-50 transition-colors"
            >
                {isVideo ? (
                    <video
                        src={meme.media_url}
                        className="w-full h-full object-cover"
                        controls={false}
                    />
                ) : (
                    <Image
                        src={meme.media_url}
                        alt={meme.title || 'Meme submission'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                    />
                )}

                {/* Status Badge Over Image */}
                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border backdrop-blur-md ${config.color.replace('bg-', 'bg-white/80 ')}`}>
                    {config.icon}
                    {config.label}
                </div>
            </button>

            {/* Content */}
            <div className="p-5 space-y-3">
                {meme.title && (
                    <h3 className="font-bold text-slate-900 leading-tight">
                        {meme.title}
                    </h3>
                )}

                <ExpandableCaption
                    caption={meme.caption || ''}
                    maxLines={2}
                />

                {/* Meta Info & Actions */}
                <div className="pt-3 border-t border-slate-50 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {meme.created_at ? new Date(meme.created_at).toLocaleDateString() : 'Just now'}
                        </span>

                        {meme.status === 'rejected' && meme.rejection_reason && (
                            <div className="group/reason relative">
                                <button className="p-1 hover:text-red-500 transition-colors">
                                    <Info className="w-3.5 h-3.5" />
                                </button>
                                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover/reason:opacity-100 transition-opacity pointer-events-none z-10">
                                    <strong>Reason:</strong> {meme.rejection_reason}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons for Pending Memes */}
                    {meme.status === 'pending' && (onEdit || onDelete) && (
                        <div className="flex gap-2">
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(meme)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition border border-indigo-100"
                                >
                                    <Edit2 className="w-3 h-3" />
                                    Edit
                                </button>
                            )}
                            {onDelete && meme.id && (
                                <button
                                    onClick={() => onDelete(meme.id!)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition border border-rose-100"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
