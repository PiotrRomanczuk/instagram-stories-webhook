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
    ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MemeSubmission, MemeStatus, UserRole } from '@/lib/types';
import { MemeStatusBadge } from '@/app/components/ui/meme-status-badge';
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
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete');
        }
    };

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
                            />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

function MemeCard({ meme, onAction, onDelete }: { 
    meme: MemeSubmission, 
    onAction: (id: string, action: 'approve' | 'reject' | 'schedule', data?: { rejectionReason?: string, scheduledFor?: string }) => void,
    onDelete: (id: string) => void
}) {
    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');

    return (
        <div className="group bg-white rounded-3xl border border-slate-200 overflow-hidden transition-all hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
            {/* Media Preview */}
            <div className="relative aspect-square bg-slate-100 overflow-hidden">
                <Image
                    src={meme.media_url}
                    alt={meme.title || 'Meme'}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                />
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

                <p className="text-sm text-slate-600 line-clamp-2 mb-4 h-10">
                    {meme.caption || <span className="italic opacity-40">No caption</span>}
                </p>

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
