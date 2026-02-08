'use client';

import { useState } from 'react';
import { Calendar, CheckCircle, Send, Ban } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Spinner } from '@/app/components/ui/spinner';

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

    const current = config[action] || config.approve;
    const Icon = current.icon;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${current.bg}`}>
                            <Icon className={`w-6 h-6 ${current.color}`} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">
                                {current.title}
                            </DialogTitle>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {action}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <p className="text-slate-600 dark:text-slate-300">
                    {current.description}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {action === 'schedule' && (
                        <div className="space-y-2">
                            <Label className="font-semibold">
                                Publication Time
                            </Label>
                            <Input
                                type="datetime-local"
                                value={scheduleTime}
                                min={minDate}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    {action === 'reject' && (
                        <div className="space-y-2">
                            <Label className="font-semibold">
                                Reason (Optional)
                            </Label>
                            <Textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Why is it being rejected?"
                                rows={3}
                            />
                        </div>
                    )}

                    <DialogFooter className="gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isProcessing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isProcessing}
                            className={`font-bold text-white ${current.btnColor}`}
                        >
                            {isProcessing ? (
                                <>
                                    <Spinner className="size-4" />
                                    Processing...
                                </>
                            ) : (
                                'Confirm'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
