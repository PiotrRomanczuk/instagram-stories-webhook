import { Badge } from './badge';

type StatusType = 'pending' | 'processing' | 'published' | 'failed' | 'cancelled';

interface StatusBadgeProps {
    status: StatusType;
}

const statusConfig = {
    pending: { className: 'bg-blue-50 text-blue-700 border-transparent', label: 'Pending' },
    processing: { className: 'bg-indigo-50 text-indigo-700 border-transparent', label: 'Processing' },
    published: { className: 'bg-green-50 text-green-700 border-transparent', label: 'Published' },
    failed: { className: 'bg-red-50 text-red-700 border-transparent', label: 'Failed' },
    cancelled: { className: 'bg-gray-50 text-gray-700 border-transparent', label: 'Cancelled' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.pending;

    return (
        <Badge className={`text-[10px] px-2 py-0.5 font-bold uppercase ${config.className}`}>
            {config.label}
        </Badge>
    );
}
