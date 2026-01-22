import React from 'react';

interface PanelProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    icon?: React.ReactNode;
}

export function Panel({ children, className = '', title, icon }: PanelProps) {
    return (
        <div className={`bg-white rounded-3xl p-8 shadow-xl shadow-gray-100/50 border border-gray-100 ${className}`}>
            {(title || icon) && (
                <div className="flex items-center gap-3 mb-6">
                    {icon && (
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            {icon}
                        </div>
                    )}
                    {title && <h2 className="text-2xl font-black text-gray-900">{title}</h2>}
                </div>
            )}
            {children}
        </div>
    );
}
