'use client';

import Image from 'next/image';
import { Clock, CheckCircle2, AlertCircle, Calendar, Info } from 'lucide-react';
import { MemeSubmission } from '@/lib/types';

interface MemeCardProps {
    meme: MemeSubmission;
}

export function MemeCard({ meme }: MemeCardProps) {
    const statusConfig = {
        pending: {
            color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50',
            icon: <Clock className="w-3 h-3" />,
            label: 'Pending Review'
        },
        approved: {
            color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900/50',
            icon: <CheckCircle2 className="w-3 h-3" />,
            label: 'Approved'
        },
        rejected: {
            color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50',
            icon: <AlertCircle className="w-3 h-3" />,
            label: 'Rejected'
        },
        scheduled: {
            color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50',
            icon: <Calendar className="w-3 h-3" />,
            label: 'Scheduled'
        },
        published: {
            color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50',
            icon: <CheckCircle2 className="w-3 h-3" />,
            label: 'Published'
        }
    };

    const config = statusConfig[meme.status as keyof typeof statusConfig] || statusConfig.pending;
    const isVideo = meme.media_url.toLowerCase().endsWith('.mp4');

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
            {/* Media Preview */}
            <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
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
                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border backdrop-blur-md ${config.color.replace(/bg-[\w-]+/, 'bg-white/80 dark:bg-slate-900/80')}`}>
                    {config.icon}
                    {config.label}
                </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
                {meme.title && (
                    <h3 className="font-bold text-slate-900 dark:text-white leading-tight">
                        {meme.title}
                    </h3>
                )}
                
                {meme.caption && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                        {meme.caption}
                    </p>
                )}

                {!meme.title && !meme.caption && (
                    <p className="text-xs text-slate-400 italic">No description provided</p>
                )}

                {/* Meta Info */}
                <div className="pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500">
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
            </div>
        </div>
    );
}
