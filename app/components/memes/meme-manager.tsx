'use client';

import { MemeSubmitForm } from './meme-submit-form';
import { MemeList } from './meme-list';
import { MemeSearchFilter } from './meme-search-filter';
import { useUserMemes } from './use-user-memes';
import { LayoutGrid, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export function MemeManager() {
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);

    const { memes, pagination, isLoading, refresh } = useUserMemes({
        search,
        status,
        page,
        limit: 12
    });

    const handleSubmissionSuccess = () => {
        setPage(1);
        refresh();
        setShowForm(false);
    };

    const handleSearchChange = (query: string) => {
        setSearch(query);
        setPage(1);
    };

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        setPage(1);
    };

    return (
        <div className="space-y-12">
            {/* Header Section with Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <LayoutGrid className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Submissions</h2>
                        <p className="text-sm font-medium text-slate-500">Manage and track your community meme contributions.</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowForm(!showForm)}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg ${
                        showForm
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-indigo-600 text-white hover:bg-slate-900 shadow-indigo-100'
                    }`}
                >
                    {showForm ? 'Cancel Submission' : <><Plus className="w-4 h-4" /> Submit New Meme</>}
                </button>
            </div>

            {/* Form Section */}
            {showForm && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <MemeSubmitForm onSubmitted={handleSubmissionSuccess} />
                </div>
            )}

            {/* Search & Filter Section */}
            {!showForm && memes.length > 0 && (
                <MemeSearchFilter
                    query={search}
                    status={status}
                    onSearchChange={handleSearchChange}
                    onStatusChange={handleStatusChange}
                />
            )}

            {/* List Section */}
            <div className="space-y-6">
                {!showForm && memes.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl w-fit text-[10px] font-black uppercase tracking-widest border border-indigo-100/50">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Page {page} - {memes.length} {memes.length === 1 ? 'Meme' : 'Memes'} Displayed
                    </div>
                )}
                <MemeList memes={memes} isLoading={isLoading} />

                {/* Pagination Controls */}
                {!showForm && memes.length > 0 && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </button>

                        <div className="text-sm font-medium text-slate-600">
                            Page <span className="font-black text-indigo-600">{page}</span>
                        </div>

                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={!pagination.hasMore || isLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
