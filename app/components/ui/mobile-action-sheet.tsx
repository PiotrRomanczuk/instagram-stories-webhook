'use client';

import { ReactNode } from 'react';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from './drawer';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface MobileActionSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export function MobileActionSheet({ isOpen, onClose, title, children }: MobileActionSheetProps) {
    return (
        <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DrawerContent className="lg:hidden max-h-[80vh]">
                <DrawerHeader className="border-b border-slate-100 px-6 pb-4">
                    <DrawerTitle className="text-lg font-bold text-slate-900">{title}</DrawerTitle>
                </DrawerHeader>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
                {/* Safe Area for Bottom Home Indicator */}
                <div className="h-8" />
            </DrawerContent>
        </Drawer>
    );
}

interface MobileActionButtonProps {
    onClick: () => void;
    icon: ReactNode;
    label: string;
    variant?: 'default' | 'primary' | 'success' | 'danger';
    disabled?: boolean;
}

const variantClasses = {
    default: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    primary: 'bg-indigo-500 text-white hover:bg-indigo-600',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600',
    danger: 'bg-rose-500 text-white hover:bg-rose-600',
};

export function MobileActionButton({
    onClick,
    icon,
    label,
    variant = 'default',
    disabled = false
}: MobileActionButtonProps) {
    return (
        <Button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-base min-h-[56px]',
                variantClasses[variant]
            )}
        >
            {icon}
            {label}
        </Button>
    );
}
