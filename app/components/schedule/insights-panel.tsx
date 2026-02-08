'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Eye, Users, Reply, ArrowRight, ArrowLeft, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { MediaInsight } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/app/components/ui/alert';

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
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden">
                <DialogHeader className="px-8 pt-8 pb-4 bg-slate-50/50">
                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <BarChart3 className="w-7 h-7 text-indigo-600" />
                        Performance <span className="text-indigo-600">Insights</span>
                    </DialogTitle>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time stats from Instagram</p>
                </DialogHeader>

                <div className="p-8 flex-1 overflow-y-auto min-h-[400px]">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                            <p className="text-sm font-bold text-slate-400">Loading metrics...</p>
                        </div>
                    ) : error ? (
                        <Alert variant="destructive" className="rounded-3xl bg-rose-50 border-rose-100 p-6 flex flex-col items-center text-center">
                            <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
                            <AlertTitle className="text-rose-900 font-bold mb-2">Could not load insights</AlertTitle>
                            <AlertDescription className="text-rose-600 text-sm">{error}</AlertDescription>
                            <Button
                                onClick={fetchInsights}
                                className="mt-6 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700"
                            >
                                Try Again
                            </Button>
                        </Alert>
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

                <DialogFooter className="p-8 pt-4">
                    <Button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-200"
                        size="lg"
                    >
                        Close View
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
