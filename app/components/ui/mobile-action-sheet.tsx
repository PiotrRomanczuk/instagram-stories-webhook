'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface MobileActionSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export function MobileActionSheet({ isOpen, onClose, title, children }: MobileActionSheetProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Action Sheet */}
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
                {/* Handle Bar */}
                <div className="flex items-center justify-center pt-2 pb-4">
                    <div className="w-12 h-1 bg-slate-300 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {children}
                </div>

                {/* Safe Area for Bottom Home Indicator */}
                <div className="h-8"></div>
            </div>
        </div>
    );
}

interface MobileActionButtonProps {
    onClick: () => void;
    icon: ReactNode;
    label: string;
    variant?: 'default' | 'primary' | 'success' | 'danger';
    disabled?: boolean;
}

export function MobileActionButton({
    onClick,
    icon,
    label,
    variant = 'default',
    disabled = false
}: MobileActionButtonProps) {
    const variantClasses = {
        default: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
        primary: 'bg-indigo-500 text-white hover:bg-indigo-600',
        success: 'bg-emerald-500 text-white hover:bg-emerald-600',
        danger: 'bg-rose-500 text-white hover:bg-rose-600'
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-base transition min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]}`}
        >
            {icon}
            {label}
        </button>
    );
}
