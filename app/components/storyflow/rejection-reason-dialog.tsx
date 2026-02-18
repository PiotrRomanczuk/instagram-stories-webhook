'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from '@/app/components/ui/alert-dialog';
import { Spinner } from '@/app/components/ui/spinner';
import { cn } from '@/lib/utils';

const REJECTION_REASONS = [
    { label: 'Low quality', value: 'Image or video quality does not meet publishing standards' },
    { label: 'Off-brand', value: 'Content does not align with brand guidelines or tone' },
    { label: 'Inappropriate', value: 'Content contains inappropriate or unsuitable material' },
    { label: 'Duplicate', value: 'Similar content has already been published or scheduled' },
    { label: 'Missing context', value: 'Caption or content lacks sufficient context or information' },
];

interface RejectionReasonDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void | Promise<void>;
    isLoading?: boolean;
    /** Pre-filled reason from the review comment field */
    initialReason?: string;
}

export function RejectionReasonDialog({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
    initialReason = '',
}: RejectionReasonDialogProps) {
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [customReason, setCustomReason] = useState(initialReason);

    // Reset state when dialog opens
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            onClose();
        } else {
            setSelectedPreset(null);
            setCustomReason(initialReason);
        }
    };

    const handlePresetClick = (value: string) => {
        if (selectedPreset === value) {
            setSelectedPreset(null);
            setCustomReason(initialReason);
        } else {
            setSelectedPreset(value);
            setCustomReason(value);
        }
    };

    const handleConfirm = async () => {
        const reason = customReason.trim();
        if (!reason) return;
        await onConfirm(reason);
    };

    const hasReason = customReason.trim().length > 0;

    return (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
            <AlertDialogContent size="sm" className="rounded-2xl max-w-md">
                <AlertDialogHeader>
                    <div className="rounded-full bg-red-50 p-3">
                        <AlertTriangle className="h-10 w-10 text-red-500" />
                    </div>
                    <AlertDialogTitle className="text-xl font-bold text-gray-900">
                        Reject Story
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-gray-500 leading-relaxed">
                        Please provide a reason for rejection. This feedback will be shared with the content creator.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {/* Preset Reasons */}
                <div className="flex flex-wrap gap-2 my-3">
                    {REJECTION_REASONS.map((reason) => (
                        <button
                            key={reason.label}
                            type="button"
                            onClick={() => handlePresetClick(reason.value)}
                            className={cn(
                                'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                                'border',
                                selectedPreset === reason.value
                                    ? 'bg-red-50 border-red-300 text-red-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            )}
                        >
                            {reason.label}
                        </button>
                    ))}
                </div>

                {/* Custom Reason Text */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        Rejection Reason
                    </label>
                    <textarea
                        value={customReason}
                        onChange={(e) => {
                            setCustomReason(e.target.value);
                            setSelectedPreset(null); // Clear preset when manually editing
                        }}
                        placeholder="Describe why this content is being rejected..."
                        className={cn(
                            'w-full min-h-[80px] p-3 rounded-xl resize-none',
                            'bg-white border border-gray-200',
                            'text-gray-900 placeholder:text-gray-400 text-sm',
                            'focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400'
                        )}
                        autoFocus
                    />
                </div>

                <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col mt-2">
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isLoading || !hasReason}
                        className={cn(
                            'w-full py-3 rounded-xl font-bold shadow-md',
                            'bg-red-600 hover:bg-red-700 text-white',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                    >
                        {isLoading && <Spinner className="h-4 w-4" />}
                        Reject Story
                    </AlertDialogAction>
                    <AlertDialogCancel
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full py-3 rounded-xl text-gray-600 font-semibold border-none shadow-none hover:bg-gray-100"
                    >
                        Cancel
                    </AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
