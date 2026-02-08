import { MemeStatus } from '@/lib/types';
import { Badge } from './badge';
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
        className: 'bg-blue-50 text-blue-700 border-blue-100',
        label: 'Pending',
        icon: Clock
    },
    approved: {
        className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        label: 'Approved',
        icon: CheckCircle
    },
    rejected: {
        className: 'bg-rose-50 text-rose-700 border-rose-100',
        label: 'Rejected',
        icon: XCircle
    },
    scheduled: {
        className: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        label: 'Scheduled',
        icon: Calendar
    },
    published: {
        className: 'bg-violet-50 text-violet-700 border-violet-100',
        label: 'Published',
        icon: Send
    },
};

export function MemeStatusBadge({ status }: MemeStatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
        <Badge className={`gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${config.className}`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </Badge>
    );
}
