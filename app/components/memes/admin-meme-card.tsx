'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckCircle, XCircle, Send, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import { MemeSubmission } from '@/lib/memes-db';
import { MemeActionModal, ActionType } from './meme-action-modal';

interface AdminMemeCardProps {
    meme: MemeSubmission;
    onUpdate: () => void;
}

export function AdminMemeCard({ meme, onUpdate }: AdminMemeCardProps) {
    const [action, setAction] = useState<ActionType | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAction = async (actionType: ActionType, data?: Record<string, unknown>) => {
        setIsProcessing(true);
        try {
            const apiAction =
                actionType === 'publish' ? 'publish' :
                    actionType === 'schedule' ? 'schedule' :
                        'review'; // approve/reject are 'review'

            const body =
                apiAction === 'review' ? { action: actionType, ...data } :
                    data;

            const res = await fetch(`/api/memes/${meme.id}/${apiAction}`, {
                method: apiAction === 'review' ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            toast.success(
                actionType === 'publish' ? 'Published to Instagram! 🎉' :
                    actionType === 'schedule' ? 'Scheduled successfully!' :
                        actionType === 'reject' ? 'Submission rejected' :
                            'Submission approved!'
            );
            onUpdate();
            setAction(null);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Action failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const isPending = meme.status === 'pending';
    const canPublish = isPending || meme.status === 'approved';

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                {/* Image */}
                <div className="relative aspect-square bg-slate-100 dark:bg-slate-900 group">
                    <Image
                        src={meme.media_url}
                        alt={meme.title || 'Meme'}
                        fill
                        className="object-cover"
                    />

                    {/* Status */}
                    <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold ${meme.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        meme.status === 'approved' ? 'bg-green-100 text-green-700' :
                            meme.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                meme.status === 'published' ? 'bg-indigo-100 text-indigo-700' :
                                    'bg-blue-100 text-blue-700'
                        }`}>
                        {meme.status.charAt(0).toUpperCase() + meme.status.slice(1)}
                    </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <User className="w-4 h-4" />
                        <span className="truncate">{meme.user_email}</span>
                    </div>

                    {meme.title && (
                        <h3 className="font-bold text-slate-900 dark:text-white truncate">
                            {meme.title}
                        </h3>
                    )}

                    {meme.caption && (
                        <p className="text-sm text-slate-500 line-clamp-2">{meme.caption}</p>
                    )}

                    {/* Actions */}
                    <div className="pt-2 flex flex-col gap-2">
                        {isPending && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAction('approve')}
                                    className="flex-1 py-2 px-3 rounded-lg bg-green-500 text-white font-semibold text-sm hover:bg-green-600 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Approve
                                </button>
                                <button
                                    onClick={() => setAction('reject')}
                                    className="flex-1 py-2 px-3 rounded-lg bg-red-500 text-white font-semibold text-sm hover:bg-red-600 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <XCircle className="w-4 h-4" />
                                    Reject
                                </button>
                            </div>
                        )}

                        {canPublish && (
                            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={() => setAction('publish')}
                                    className="flex-[2] py-2 px-3 rounded-lg bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                    Publish Now
                                </button>
                                <button
                                    onClick={() => setAction('schedule')}
                                    className="flex-1 py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
                                >
                                    <Calendar className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            <MemeActionModal
                isOpen={!!action}
                action={action as ActionType}
                onClose={() => setAction(null)}
                onConfirm={handleAction}
                isProcessing={isProcessing}
            />
        </>
    );
}
