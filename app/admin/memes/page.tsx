'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ChevronLeft,
    Clock,
    CheckCircle,
    XCircle,
    Trash2,
    Calendar,
    AlertCircle,
    Loader2,
    ImageIcon,
    CheckSquare,
    Square
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MemeSubmission, MemeStatus, UserRole } from '@/lib/types';
import { MemeStatusBadge } from '@/app/components/ui/meme-status-badge';
import { ExpandableCaption } from '@/app/components/ui/expandable-caption';
import Image from 'next/image';

export default function AdminMemesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        } else if (status === 'authenticated') {
            const role = (session?.user as { role?: UserRole })?.role;
            if (role !== 'admin' && role !== 'developer') {
                router.push('/');
            }
        }
    }, [status, session, router]);

    const [memes, setMemes] = useState<MemeSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<MemeStatus | 'all'>('all');
    const [selectedMemes, setSelectedMemes] = useState<Set<string>>(new Set());
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        scheduled: 0,
        published: 0,
        rejected: 0
    });

    const fetchMemes = useCallback(async () => {
        setIsLoading(true);
        try {
            const url = filter === 'all' ? '/api/memes' : `/api/memes?status=${filter}`;
            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMemes(data.memes || []);
            
            if (filter === 'all') {
                const newStats = {
                    total: data.memes.length,
                    pending: data.memes.filter((m: MemeSubmission) => m.status === 'pending').length,
                    approved: data.memes.filter((m: MemeSubmission) => m.status === 'approved').length,
                    scheduled: data.memes.filter((m: MemeSubmission) => m.status === 'scheduled').length,
                    published: data.memes.filter((m: MemeSubmission) => m.status === 'published').length,
                    rejected: data.memes.filter((m: MemeSubmission) => m.status === 'rejected').length,
                };
                setStats(newStats);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load memes');
        } finally {
            setIsLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchMemes();
    }, [fetchMemes]);

    const handleAction = async (id: string, action: 'approve' | 'reject' | 'schedule', data?: { rejectionReason?: string, scheduledFor?: string }) => {
        try {
            const res = await fetch(`/api/memes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data })
            });
            const result = await res.json();
            if (!res.ok) {
                const errorMsg = result.details ? `${result.error}: ${result.details}` : result.error;
                throw new Error(errorMsg);
            }

            toast.success(`Meme ${action}ed successfully`);
            fetchMemes();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : `Failed to ${action}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this meme?')) return;
        try {
            const res = await fetch(`/api/memes/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            toast.success('Meme deleted');
            setMemes(prev => prev.filter(m => m.id !== id));
            setSelectedMemes(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete');
        }
    };

    // Bulk action handlers
    const toggleMemeSelection = (id: string) => {
        setSelectedMemes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedMemes.size === memes.length) {
            setSelectedMemes(new Set());
        } else {
            setSelectedMemes(new Set(memes.map(m => m.id!)));
        }
    };

    const clearSelection = () => {
        setSelectedMemes(new Set());
    };

    const handleBulkApprove = async () => {
        if (selectedMemes.size === 0) return;

        const confirmMsg = `Approve ${selectedMemes.size} meme(s)?`;
        if (!confirm(confirmMsg)) return;

        const promises = Array.from(selectedMemes).map(id =>
            handleAction(id, 'approve')
        );

        try {
            await Promise.all(promises);
            toast.success(`${selectedMemes.size} meme(s) approved`);
            clearSelection();
            fetchMemes();
        } catch (error) {
            toast.error('Some memes failed to approve');
        }
    };

    const [bulkRejectionModalOpen, setBulkRejectionModalOpen] = useState(false);
    const [bulkRejectionReason, setBulkRejectionReason] = useState('');

    const handleBulkReject = async () => {
        if (selectedMemes.size === 0) return;
        setBulkRejectionModalOpen(true);
    };

    const confirmBulkReject = async () => {
        if (!bulkRejectionReason.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }

        const promises = Array.from(selectedMemes).map(id =>
            handleAction(id, 'reject', { rejectionReason: bulkRejectionReason })
        );

        try {
            await Promise.all(promises);
            toast.success(`${selectedMemes.size} meme(s) rejected`);
            clearSelection();
            setBulkRejectionModalOpen(false);
            setBulkRejectionReason('');
            fetchMemes();
        } catch (error) {
            toast.error('Some memes failed to reject');
        }
    };

    const [bulkScheduleModalOpen, setBulkScheduleModalOpen] = useState(false);
    const [bulkScheduleDate, setBulkScheduleDate] = useState('');

    // Quick schedule state
    const [quickScheduleMeme, setQuickScheduleMeme] = useState<MemeSubmission | null>(null);
    const [quickScheduleDate, setQuickScheduleDate] = useState('');

    const handleBulkSchedule = async () => {
        if (selectedMemes.size === 0) return;
        setBulkScheduleModalOpen(true);
    };

    const confirmBulkSchedule = async () => {
        if (!bulkScheduleDate) {
            toast.error('Please select a date and time');
            return;
        }

        const promises = Array.from(selectedMemes).map(id =>
            handleAction(id, 'schedule', { scheduledFor: new Date(bulkScheduleDate).toISOString() })
        );

        try {
            await Promise.all(promises);
            toast.success(`${selectedMemes.size} meme(s) scheduled`);
            clearSelection();
            setBulkScheduleModalOpen(false);
            setBulkScheduleDate('');
            fetchMemes();
        } catch (error) {
            toast.error('Some memes failed to schedule');
        }
    };

    // Quick schedule to post scheduler
    const handleQuickSchedule = async () => {
        if (!quickScheduleMeme || !quickScheduleDate) {
            toast.error('Please select a date and time');
            return;
        }

        try {
            // Create scheduled post from meme
            const res = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: quickScheduleMeme.media_url,
                    type: quickScheduleMeme.media_url.toLowerCase().endsWith('.mp4') ? 'VIDEO' : 'IMAGE',
                    scheduledTime: new Date(quickScheduleDate).toISOString(),
                    caption: quickScheduleMeme.caption || quickScheduleMeme.title || '',
                    userTags: [],
                    hashtagTags: []
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to schedule');
            }

            toast.success('Meme scheduled successfully!');
            setQuickScheduleMeme(null);
            setQuickScheduleDate('');

            // Optionally update meme status to scheduled
            await handleAction(quickScheduleMeme.id!, 'schedule', {
                scheduledFor: new Date(quickScheduleDate).toISOString()
            });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to schedule');
        }
    };

    // Keyboard shortcuts (Ctrl+A, Escape)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'a' && memes.length > 0) {
                e.preventDefault();
                toggleSelectAll();
            }
            if (e.key === 'Escape' && selectedMemes.size > 0) {
                clearSelection();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [memes, selectedMemes]);

    return (
        <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/admin/users"
                        className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest mb-4 group"
                    >
                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        User Whitelist
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900">
                                Meme <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Review</span>
                            </h1>
                            <p className="text-slate-500 mt-1">
                                Review and publish community submissions
                            </p>
                        </div>
                        
                        {/* Status Filter */}
                        <div className="flex flex-wrap gap-2">
                            {(['all', 'pending', 'approved', 'scheduled', 'published', 'rejected'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setFilter(s)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                        filter === s 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                                    }`}
                                >
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                    {filter === 'all' && stats[s as keyof typeof stats] > 0 && (
                                        <span className="ml-2 opacity-60 font-medium">
                                            {s === 'all' ? stats.total : stats[s as keyof typeof stats]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bulk Actions Toolbar */}
                {selectedMemes.size > 0 && (
                    <div className="mb-6 bg-indigo-600 rounded-2xl p-4 shadow-lg shadow-indigo-500/30 flex items-center justify-between gap-4 animate-in slide-in-from-top-2 fade-in duration-300">
                        <div className="flex items-center gap-3">
                            <CheckSquare className="w-5 h-5 text-white" />
                            <span className="text-white font-bold">
                                {selectedMemes.size} meme{selectedMemes.size > 1 ? 's' : ''} selected
                            </span>
                            <button
                                onClick={clearSelection}
                                className="text-indigo-200 hover:text-white text-sm font-medium transition"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={handleBulkApprove}
                                className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 transition flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Approve ({selectedMemes.size})
                            </button>
                            <button
                                onClick={handleBulkReject}
                                className="px-4 py-2 bg-rose-500 text-white rounded-lg font-bold text-sm hover:bg-rose-600 transition flex items-center gap-2"
                            >
                                <XCircle className="w-4 h-4" />
                                Reject
                            </button>
                            <button
                                onClick={handleBulkSchedule}
                                className="px-4 py-2 bg-purple-500 text-white rounded-lg font-bold text-sm hover:bg-purple-600 transition flex items-center gap-2"
                            >
                                <Calendar className="w-4 h-4" />
                                Schedule
                            </button>
                        </div>
                    </div>
                )}

                {/* Select All Checkbox */}
                {memes.length > 0 && !isLoading && (
                    <div className="mb-4 flex items-center gap-3">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 hover:border-indigo-400 transition text-sm font-medium text-slate-700 hover:text-indigo-600"
                        >
                            {selectedMemes.size === memes.length ? (
                                <CheckSquare className="w-4 h-4" />
                            ) : (
                                <Square className="w-4 h-4" />
                            )}
                            {selectedMemes.size === memes.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className="text-xs text-slate-400 font-medium">
                            Keyboard: Ctrl+A to select all, Esc to clear
                        </span>
                    </div>
                )}

                {/* Content Grid */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                        <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
                        <p className="font-medium animate-pulse">Loading memes...</p>
                    </div>
                ) : memes.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <ImageIcon className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No memes found</h3>
                        <p className="text-slate-500">There are no memes matching your current filter.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {memes.map((meme) => (
                            <MemeCard
                                key={meme.id}
                                meme={meme}
                                onAction={handleAction}
                                onDelete={handleDelete}
                                isSelected={selectedMemes.has(meme.id!)}
                                onToggleSelect={() => toggleMemeSelection(meme.id!)}
                                onQuickSchedule={(meme) => {
                                    setQuickScheduleMeme(meme);
                                    setQuickScheduleDate('');
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Bulk Rejection Modal */}
                {bulkRejectionModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">
                                Reject {selectedMemes.size} Meme{selectedMemes.size > 1 ? 's' : ''}
                            </h3>
                            <p className="text-slate-600 mb-4">
                                Please provide a reason for rejecting these memes.
                            </p>
                            <textarea
                                value={bulkRejectionReason}
                                onChange={(e) => setBulkRejectionReason(e.target.value)}
                                placeholder="Enter rejection reason..."
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                                rows={4}
                            />
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setBulkRejectionModalOpen(false);
                                        setBulkRejectionReason('');
                                    }}
                                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmBulkReject}
                                    disabled={!bulkRejectionReason.trim()}
                                    className="flex-1 px-4 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Reject All
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Schedule Modal */}
                {bulkScheduleModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">
                                Schedule {selectedMemes.size} Meme{selectedMemes.size > 1 ? 's' : ''}
                            </h3>
                            <p className="text-slate-600 mb-4">
                                All selected memes will be scheduled for the same date and time.
                            </p>
                            <input
                                type="datetime-local"
                                value={bulkScheduleDate}
                                onChange={(e) => setBulkScheduleDate(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                min={new Date().toISOString().slice(0, 16)}
                            />
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setBulkScheduleModalOpen(false);
                                        setBulkScheduleDate('');
                                    }}
                                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmBulkSchedule}
                                    disabled={!bulkScheduleDate}
                                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Schedule All
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Schedule Modal */}
                {quickScheduleMeme && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                                    <Calendar className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900">Quick Schedule</h3>
                                    <p className="text-sm text-slate-500">Schedule this meme to Instagram</p>
                                </div>
                            </div>

                            {/* Meme Preview */}
                            <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex gap-3">
                                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                                        <Image
                                            src={quickScheduleMeme.media_url}
                                            alt={quickScheduleMeme.title || 'Meme'}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 truncate">
                                            {quickScheduleMeme.title || 'Untitled'}
                                        </h4>
                                        <p className="text-xs text-slate-500 line-clamp-2">
                                            {quickScheduleMeme.caption || 'No caption'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        When should this be published?
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={quickScheduleDate}
                                        onChange={(e) => setQuickScheduleDate(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                        min={new Date().toISOString().slice(0, 16)}
                                    />
                                </div>

                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                                    <p className="text-xs text-indigo-700">
                                        <strong>💡 Tip:</strong> This will create a scheduled post. You can edit caption, tags, and other details in the Schedule Manager.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setQuickScheduleMeme(null);
                                        setQuickScheduleDate('');
                                    }}
                                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleQuickSchedule}
                                    disabled={!quickScheduleDate}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Calendar className="w-4 h-4" />
                                    Schedule Now
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

function MemeCard({ meme, onAction, onDelete, isSelected, onToggleSelect, onQuickSchedule }: {
    meme: MemeSubmission,
    onAction: (id: string, action: 'approve' | 'reject' | 'schedule', data?: { rejectionReason?: string, scheduledFor?: string }) => void,
    onDelete: (id: string) => void,
    isSelected: boolean,
    onToggleSelect: () => void,
    onQuickSchedule?: (meme: MemeSubmission) => void
}) {
    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');

    return (
        <div className={`group bg-white rounded-3xl border-2 overflow-hidden transition-all hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 ${
            isSelected ? 'border-indigo-600 ring-4 ring-indigo-200' : 'border-slate-200'
        }`}>
            {/* Media Preview */}
            <div className="relative aspect-square bg-slate-100 overflow-hidden">
                <Image
                    src={meme.media_url}
                    alt={meme.title || 'Meme'}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                />

                {/* Selection Checkbox */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect();
                    }}
                    className="absolute top-3 left-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition shadow-lg"
                >
                    {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-600" />
                    ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                    )}
                </button>

                <div className="absolute top-3 right-3">
                    <MemeStatusBadge status={meme.status} />
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <div className="overflow-hidden">
                        <h3 className="font-bold text-slate-900 truncate">
                            {meme.title || 'Untitled Meme'}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">
                            by {meme.user_email}
                        </p>
                    </div>
                    <button 
                        onClick={() => onDelete(meme.id!)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                <div className="mb-4 min-h-[2.5rem]">
                    <ExpandableCaption
                        caption={meme.caption || ''}
                        maxLines={2}
                        showCharCount={true}
                    />
                </div>

                {/* Actions */}
                <div className="space-y-2">
                    {meme.status === 'pending' && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => onAction(meme.id!, 'approve')}
                                className="flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white text-xs font-black rounded-xl hover:bg-emerald-600 transition-colors uppercase tracking-tight"
                            >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Approve
                            </button>
                            <button
                                onClick={() => setIsRejectionModalOpen(true)}
                                className="flex items-center justify-center gap-2 py-2.5 bg-rose-500 text-white text-xs font-black rounded-xl hover:bg-rose-600 transition-colors uppercase tracking-tight"
                            >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                            </button>
                        </div>
                    )}

                    {(meme.status === 'pending' || meme.status === 'approved') && (
                        <button
                            onClick={() => setIsScheduleModalOpen(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-500 text-white text-xs font-black rounded-xl hover:bg-indigo-600 transition-colors uppercase tracking-tight"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            Schedule
                        </button>
                    )}

                    {/* Quick Schedule Button for Approved Memes */}
                    {meme.status === 'approved' && onQuickSchedule && (
                        <button
                            onClick={() => onQuickSchedule(meme)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-black rounded-xl hover:shadow-lg transition uppercase tracking-tight"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            ⚡ Quick Schedule
                        </button>
                    )}

                    {meme.status === 'scheduled' && (
                        <div className="bg-indigo-50 rounded-xl p-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-bold text-indigo-600">
                                {new Date(meme.scheduled_time!).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                        </div>
                    )}

                    {meme.status === 'rejected' && meme.rejection_reason && (
                        <div className="bg-rose-50 rounded-xl p-3 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs font-medium text-rose-600 line-clamp-2">
                                {meme.rejection_reason}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Rejection Modal */}
            {isRejectionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-200">
                        <h3 className="text-2xl font-black text-slate-900 mb-4">Reject Meme</h3>
                        <p className="text-slate-500 mb-6 font-medium">Please provide a reason why this meme is being rejected. This will be visible to the user.</p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Reason for rejection..."
                            className="w-full h-32 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 transition-all outline-none mb-6 resize-none"
                        />
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsRejectionModalOpen(false)}
                                className="flex-1 py-4 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onAction(meme.id!, 'reject', { rejectionReason });
                                    setIsRejectionModalOpen(false);
                                }}
                                disabled={!rejectionReason.trim()}
                                className="flex-1 py-4 rounded-2xl font-black bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50"
                            >
                                Reject Meme
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Modal */}
            {isScheduleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-200">
                        <h3 className="text-2xl font-black text-slate-900 mb-4">Schedule Meme</h3>
                        <p className="text-slate-500 mb-6 font-medium">Select a date and time to publish this meme as a story.</p>
                        <input
                            type="datetime-local"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none mb-6"
                        />
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsScheduleModalOpen(false)}
                                className="flex-1 py-4 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onAction(meme.id!, 'schedule', { scheduledFor: new Date(scheduledDate).toISOString() });
                                    setIsScheduleModalOpen(false);
                                }}
                                disabled={!scheduledDate}
                                className="flex-1 py-4 rounded-2xl font-black bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Confirm Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
