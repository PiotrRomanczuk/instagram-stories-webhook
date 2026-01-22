import React from 'react';
import { MemeStatus } from '@/lib/types';
import { 
    Clock, 
    CheckCircle, 
    XCircle, 
    Calendar, 
    Send 
} from 'lucide-react';

interface MemeStatusBadgeProps {
    status: MemeStatus;
}

const statusConfig = {
    pending: { 
        bg: 'bg-blue-50 dark:bg-blue-900/20', 
        text: 'text-blue-700 dark:text-blue-300', 
        border: 'border-blue-100 dark:border-blue-800/50',
        label: 'Pending',
        icon: Clock
    },
    approved: { 
        bg: 'bg-emerald-50 dark:bg-emerald-900/20', 
        text: 'text-emerald-700 dark:text-emerald-300', 
        border: 'border-emerald-100 dark:border-emerald-800/50',
        label: 'Approved',
        icon: CheckCircle
    },
    rejected: { 
        bg: 'bg-rose-50 dark:bg-rose-900/20', 
        text: 'text-rose-700 dark:text-rose-300', 
        border: 'border-rose-100 dark:border-rose-800/50',
        label: 'Rejected',
        icon: XCircle
    },
    scheduled: { 
        bg: 'bg-indigo-50 dark:bg-indigo-900/20', 
        text: 'text-indigo-700 dark:text-indigo-300', 
        border: 'border-indigo-100 dark:border-indigo-800/50',
        label: 'Scheduled',
        icon: Calendar
    },
    published: { 
        bg: 'bg-violet-50 dark:bg-violet-900/20', 
        text: 'text-violet-700 dark:text-violet-300', 
        border: 'border-violet-100 dark:border-violet-800/50',
        label: 'Published',
        icon: Send
    },
};

export function MemeStatusBadge({ status }: MemeStatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${config.bg} ${config.text} ${config.border}`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
}
