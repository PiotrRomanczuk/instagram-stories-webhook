'use client';

import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6">
                <Icon className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-500 max-w-sm mb-8 text-sm leading-relaxed">
                {description}
            </p>
            {action && (
                <div>
                    {action}
                </div>
            )}
        </div>
    );
}
