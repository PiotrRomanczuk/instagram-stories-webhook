'use client';

import { useState } from 'react';
import { X, Calendar, CheckCircle, Send, Ban } from 'lucide-react';
import { Loader } from 'lucide-react';

export type ActionType = 'publish' | 'schedule' | 'reject' | 'approve';

interface MemeActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (action: ActionType, data?: Record<string, unknown>) => Promise<void>;
    action: ActionType;
    isProcessing: boolean;
}

export function MemeActionModal({ isOpen, onClose, onConfirm, action, isProcessing }: MemeActionModalProps) {
    const [scheduleTime, setScheduleTime] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (action === 'schedule') {
            if (!scheduleTime) return;
            const timestamp = new Date(scheduleTime).getTime();
            await onConfirm('schedule', { scheduled_time: timestamp });
        } else if (action === 'reject') {
            await onConfirm('reject', { rejection_reason: rejectionReason });
        } else {
            await onConfirm(action);
        }
    };

    const minDate = new Date().toISOString().slice(0, 16);

    const config = {
        publish: {
            title: 'Publish to Instagram',
            description: 'This will instantly publish the meme to your Instagram Story.',
            icon: Send,
            color: 'text-indigo-600',
            bg: 'bg-indigo-100 dark:bg-indigo-900/30',
            btnColor: 'bg-indigo-600 hover:bg-indigo-700'
        },
        schedule: {
            title: 'Schedule Post',
            description: 'Choose a date and time to publish this meme.',
            icon: Calendar,
            color: 'text-blue-600',
            bg: 'bg-blue-100 dark:bg-blue-900/30',
            btnColor: 'bg-blue-600 hover:bg-blue-700'
        },
        reject: {
            title: 'Reject Submission',
            description: 'Are you sure? The user will see the rejection status.',
            icon: Ban,
            color: 'text-red-600',
            bg: 'bg-red-100 dark:bg-red-900/30',
            btnColor: 'bg-red-600 hover:bg-red-700'
        },
        approve: {
            title: 'Approve Submission',
            description: 'This will mark the meme as ready for publishing.',
            icon: CheckCircle,
            color: 'text-green-600',
            bg: 'bg-green-100 dark:bg-green-900/30',
            btnColor: 'bg-green-600 hover:bg-green-700'
        }
    };

    const current = config[action] || config.approve; // Fallback
    const Icon = current.icon;

    // ... (rest of the component remains similar, kept short for reliability)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200 scale-100">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${current.bg}`}>
                                <Icon className={`w-6 h-6 ${current.color}`} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {current.title}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {action}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-500 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 mb-6">
                        {current.description}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {action === 'schedule' && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Publication Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={scheduleTime}
                                    min={minDate}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        )}

                        {action === 'reject' && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Reason (Optional)
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Why is it being rejected?"
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none resize-none"
                                />
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isProcessing}
                                className={`flex-1 px-4 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-colors ${current.btnColor}`}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Confirm'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
