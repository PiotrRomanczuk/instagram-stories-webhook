import React from 'react';

interface PanelProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    icon?: React.ReactNode;
}

export function Panel({ children, className = '', title, icon }: PanelProps) {
    return (
        <div className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-100/50 dark:shadow-none ${className}`}>
            {(title || icon) && (
                <div className="flex items-center gap-3 mb-6">
                    {icon && (
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                            {icon}
                        </div>
                    )}
                    {title && <h2 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h2>}
                </div>
            )}
            {children}
        </div>
    );
}
