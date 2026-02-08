import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { cn } from '@/lib/utils';

interface PanelProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    icon?: React.ReactNode;
}

export function Panel({ children, className = '', title, icon }: PanelProps) {
    return (
        <Card className={cn('rounded-3xl p-8 shadow-xl shadow-gray-100/50 border-gray-100', className)}>
            {(title || icon) && (
                <CardHeader className="p-0 gap-0">
                    <div className="flex items-center gap-3">
                        {icon && (
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                {icon}
                            </div>
                        )}
                        {title && <CardTitle className="text-2xl font-black text-gray-900">{title}</CardTitle>}
                    </div>
                </CardHeader>
            )}
            <CardContent className="p-0">
                {children}
            </CardContent>
        </Card>
    );
}
