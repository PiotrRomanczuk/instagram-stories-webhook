'use client';

import { Search, X } from 'lucide-react';
import { useState, useCallback } from 'react';

interface MemeSearchFilterProps {
    onSearchChange: (query: string) => void;
    onStatusChange: (status: string) => void;
    query: string;
    status: string;
}

export function MemeSearchFilter({
    onSearchChange,
    onStatusChange,
    query,
    status
}: MemeSearchFilterProps) {
    const [localQuery, setLocalQuery] = useState(query);

    const handleSearchChange = useCallback((value: string) => {
        setLocalQuery(value);
        onSearchChange(value);
    }, [onSearchChange]);

    const handleClear = useCallback(() => {
        setLocalQuery('');
        onSearchChange('');
    }, [onSearchChange]);

    return (
        <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by title or caption..."
                    value={localQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                {localQuery && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
                {['all', 'pending', 'approved', 'published', 'rejected', 'scheduled'].map(
                    (s) => (
                        <button
                            key={s}
                            onClick={() => onStatusChange(s === 'all' ? '' : s)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                (status === '' && s === 'all') || status === s
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    )
                )}
            </div>
        </div>
    );
}
