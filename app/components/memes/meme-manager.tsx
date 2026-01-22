'use client';

import { MemeSubmitForm } from './meme-submit-form';
import { MemeList } from './meme-list';
import { useUserMemes } from './use-user-memes';
import { LayoutGrid, Plus } from 'lucide-react';
import { useState } from 'react';

export function MemeManager() {
    const { memes, isLoading, refresh } = useUserMemes();
    const [showForm, setShowForm] = useState(false);

    const handleSubmissionSuccess = () => {
        refresh();
        setShowForm(false);
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

            {/* List Section */}
            <div className="space-y-6">
                {!showForm && memes.length > 0 && (
                     <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl w-fit text-[10px] font-black uppercase tracking-widest border border-indigo-100/50">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        {memes.length} {memes.length === 1 ? 'Meme' : 'Memes'} Found
                    </div>
                )}
                <MemeList memes={memes} isLoading={isLoading} />
            </div>
        </div>
    );
}
