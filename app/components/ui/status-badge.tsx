import React from 'react';

type StatusType = 'pending' | 'processing' | 'published' | 'failed' | 'cancelled';

interface StatusBadgeProps {
    status: StatusType;
}

const statusConfig = {
    pending: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Pending' },
    processing: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Processing' },
    published: { bg: 'bg-green-50', text: 'text-green-700', label: 'Published' },
    failed: { bg: 'bg-red-50', text: 'text-red-700', label: 'Failed' },
    cancelled: { bg: 'bg-gray-50', text: 'text-gray-700', label: 'Cancelled' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.pending;

    return (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${config.bg} ${config.text}`}>
            {config.label}
        </span>
    );
}
