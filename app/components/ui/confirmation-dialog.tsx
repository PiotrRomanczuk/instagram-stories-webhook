'use client';

import React from 'react';
import {
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from './alert-dialog';
import { Spinner } from './spinner';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'info' | 'success' | 'warning' | 'danger';
    isLoading?: boolean;
}

const icons = {
    info: <AlertCircle className='h-10 w-10 text-blue-500' />,
    success: <CheckCircle2 className='h-10 w-10 text-green-500' />,
    warning: <AlertTriangle className='h-10 w-10 text-yellow-500' />,
    danger: <AlertTriangle className='h-10 w-10 text-red-500' />,
};

const confirmVariants = {
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
};

export function ConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    type = 'info',
    isLoading = false,
}: ConfirmationDialogProps) {
    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <AlertDialogContent size="sm" className="rounded-2xl">
                <AlertDialogHeader>
                    <div className='rounded-full bg-gray-50 p-3'>
                        {icons[type]}
                    </div>
                    <AlertDialogTitle className='text-xl font-bold text-gray-900'>
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className='text-sm text-gray-500 leading-relaxed'>
                        {message}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`w-full py-3 rounded-xl font-bold shadow-md ${confirmVariants[type]}`}
                    >
                        {isLoading && <Spinner className='h-4 w-4' />}
                        {confirmLabel}
                    </AlertDialogAction>
                    <AlertDialogCancel
                        onClick={onClose}
                        disabled={isLoading}
                        className='w-full py-3 rounded-xl text-gray-600 font-semibold border-none shadow-none hover:bg-gray-100'
                    >
                        {cancelLabel}
                    </AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
