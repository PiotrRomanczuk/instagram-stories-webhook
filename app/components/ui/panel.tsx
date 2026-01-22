import React from 'react';

interface PanelProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    icon?: React.ReactNode;
}

export function Panel({ children, className = '', title, icon }: PanelProps) {
    return (
        <div className={`bg-white dark:bg-[#121214] rounded-3xl p-8 shadow-xl shadow-gray-100/50 dark:shadow-black/50 border border-gray-100 dark:border-white/5 transition-colors duration-300 ${className}`}>
            {(title || icon) && (
                <div className="flex items-center gap-3 mb-6">
                    {icon && (
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl transition-colors duration-300">
                            {icon}
                        </div>
                    )}
                    {title && <h2 className="text-2xl font-black text-gray-900 dark:text-white">{title}</h2>}
                </div>
            )}
            {children}
        </div>
    );
}
