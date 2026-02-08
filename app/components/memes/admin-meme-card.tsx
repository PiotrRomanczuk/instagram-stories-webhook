'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckCircle, XCircle, Send, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import { MemeSubmission } from '@/lib/memes-db';
import { MemeActionModal, ActionType } from './meme-action-modal';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';

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

    const statusVariant = meme.status === 'pending' ? 'outline' :
        meme.status === 'approved' ? 'outline' :
            meme.status === 'rejected' ? 'destructive' :
                meme.status === 'published' ? 'secondary' :
                    'outline';

    const statusClassName = meme.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
        meme.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
            meme.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                meme.status === 'published' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                    'bg-blue-100 text-blue-700 border-blue-200';

    return (
        <>
            <Card className="rounded-2xl overflow-hidden">
                {/* Image */}
                <div className="relative aspect-square bg-slate-100 dark:bg-slate-900 group">
                    <Image
                        src={meme.media_url}
                        alt={meme.title || 'Meme'}
                        fill
                        className="object-cover"
                    />

                    {/* Status */}
                    <Badge variant={statusVariant} className={`absolute top-3 left-3 ${statusClassName}`}>
                        {meme.status.charAt(0).toUpperCase() + meme.status.slice(1)}
                    </Badge>
                </div>

                {/* Info */}
                <CardContent className="p-4 space-y-3">
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
                                <Button
                                    onClick={() => setAction('approve')}
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm"
                                    size="sm"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Approve
                                </Button>
                                <Button
                                    onClick={() => setAction('reject')}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm"
                                    size="sm"
                                >
                                    <XCircle className="w-4 h-4" />
                                    Reject
                                </Button>
                            </div>
                        )}

                        {canPublish && (
                            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                <Button
                                    onClick={() => setAction('publish')}
                                    className="flex-[2] bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm"
                                    size="sm"
                                >
                                    <Send className="w-4 h-4" />
                                    Publish Now
                                </Button>
                                <Button
                                    onClick={() => setAction('schedule')}
                                    variant="secondary"
                                    className="flex-1"
                                    size="sm"
                                >
                                    <Calendar className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

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
