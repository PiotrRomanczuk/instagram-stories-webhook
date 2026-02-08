'use client';

import { LucideIcon } from 'lucide-react';
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
    EmptyContent,
} from './empty';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <Empty className="py-16 px-4 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
            <EmptyHeader>
                <EmptyMedia variant="icon" className="w-16 h-16 bg-white rounded-2xl shadow-sm mb-2">
                    <Icon className="w-8 h-8 text-slate-300" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-slate-900">{title}</EmptyTitle>
                <EmptyDescription className="max-w-sm text-slate-500 text-sm leading-relaxed">
                    {description}
                </EmptyDescription>
            </EmptyHeader>
            {action && (
                <EmptyContent>
                    {action}
                </EmptyContent>
            )}
        </Empty>
    );
}
