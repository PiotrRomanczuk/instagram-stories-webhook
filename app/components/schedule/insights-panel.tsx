'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Eye, Users, Reply, ArrowRight, ArrowLeft, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { MediaInsight } from '@/lib/instagram/insights';

interface InsightsPanelProps {
    postId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function InsightsPanel({ postId, isOpen, onClose }: InsightsPanelProps) {
    const [insights, setInsights] = useState<MediaInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInsights = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/schedule/insights/${postId}`);
            const data = await res.json();
            if (res.ok) {
                setInsights(data.insights);
            } else {
                setError(data.message || data.error || 'Failed to fetch insights');
            }
        } catch {
            setError('Failed to connect to insights service');
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        if (isOpen) {
            fetchInsights();
        }
    }, [isOpen, fetchInsights]);

    if (!isOpen) return null;

    const getIcon = (name: string) => {
        switch (name) {
            case 'impressions': return <Eye className="w-4 h-4 text-blue-500" />;
            case 'reach': return <Users className="w-4 h-4 text-indigo-500" />;
            case 'replies': return <Reply className="w-4 h-4 text-emerald-500" />;
            case 'taps_forward': return <ArrowRight className="w-4 h-4 text-slate-400" />;
            case 'taps_back': return <ArrowLeft className="w-4 h-4 text-slate-400" />;
            case 'exits': return <LogOut className="w-4 h-4 text-rose-500" />;
            default: return <BarChart3 className="w-4 h-4 text-slate-400" />;
        }
    };

    const formatValue = (val: number) => {
        if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
        return val.toString();
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl shadow-black/20 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 pt-8 pb-4 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <BarChart3 className="w-7 h-7 text-indigo-600" />
                            Performance <span className="text-indigo-600">Insights</span>
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time stats from Instagram</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 flex-1 overflow-y-auto min-h-[400px]">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                            <p className="text-sm font-bold text-slate-400">Loading metrics...</p>
                        </div>
                    ) : error ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-rose-50 rounded-3xl border border-rose-100">
                            <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
                            <h3 className="text-rose-900 font-bold mb-2">Could not load insights</h3>
                            <p className="text-rose-600 text-sm">{error}</p>
                            <button
                                onClick={fetchInsights}
                                className="mt-6 px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {insights.map((insight) => (
                                <div key={insight.name} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-white transition group">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2 bg-white rounded-xl border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition">
                                            {getIcon(insight.name)}
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{insight.title}</p>
                                    <p className="text-2xl font-black text-slate-900">
                                        {formatValue(insight.values[0]?.value || 0)}
                                    </p>
                                </div>
                            ))}
                            {insights.length === 0 && (
                                <p className="col-span-2 text-center text-slate-400 font-medium py-10">No metrics available for this content.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 pt-4">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200"
                    >
                        Close View
                    </button>
                </div>
            </div>
        </div>
    );
}
