'use client';

import { useState, useEffect } from 'react';
import { Panel } from '../ui/panel';
import { Battery, BatteryCharging, BatteryWarning, RefreshCw, AlertCircle } from 'lucide-react';

interface QuotaData {
    config?: {
        quota_duration: number;
        quota_total: number;
    };
    quota_usage: number;
}

export function QuotaUsageCard() {
    const [quota, setQuota] = useState<QuotaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchQuota = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/schedule/quota');
            const data = await res.json();

            if (res.ok && data.limit) {
                setQuota(data.limit);
            } else {
                // If 404, it might just mean no IG account linked, or API not supported for this user type
                if (res.status !== 404) {
                    setError(data.error || 'Failed to load usage data');
                }
            }
        } catch (_err) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuota();
    }, []);

    if (error) return null; // Hide if error (or handle gracefully)

    const total = quota?.config?.quota_total || 0; // Default to 0 if waiting
    const used = quota?.quota_usage || 0;

    const percentUsed = total > 0 ? (used / total) * 100 : 0;

    // Determine color based on usage
    let colorClass = 'text-emerald-500';
    let bgClass = 'bg-emerald-500';
    let Icon = Battery;

    if (percentUsed > 80) {
        colorClass = 'text-amber-500';
        bgClass = 'bg-amber-500';
        Icon = BatteryWarning;
    }
    if (percentUsed > 95) {
        colorClass = 'text-rose-500';
        bgClass = 'bg-rose-500';
        Icon = AlertCircle;
    }

    return (
        <Panel
            title="API Usage Quota"
            icon={<BatteryCharging className="w-6 h-6" />}
            className="relative"
        >
            <div className="absolute top-8 right-8">
                <button
                    onClick={fetchQuota}
                    disabled={loading}
                    className={`p-2 hover:bg-gray-100 rounded-xl transition ${loading ? 'animate-spin' : ''}`}
                    title="Refresh Quota"
                >
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            <div className="p-4">
                {loading && !quota ? (
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                        <div className="h-8 bg-slate-100 rounded w-full"></div>
                    </div>
                ) : !quota ? (
                    <p className="text-sm text-slate-400">Usage data unavailable.</p>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-black text-slate-800 tracking-tight">
                                    {used} <span className="text-lg text-slate-400 font-medium">/ {total}</span>
                                </p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Posts Used Today</p>
                            </div>
                            <div className={`p-3 rounded-2xl bg-white border border-slate-100 shadow-sm ${colorClass}`}>
                                <Icon className="w-8 h-8" />
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`absolute top-0 left-0 h-full ${bgClass} transition-all duration-1000 ease-out`}
                                style={{ width: `${percentUsed}%` }}
                            />
                        </div>

                        <p className="text-xs text-slate-400 text-center">
                            Rolling 24-hour window. Usage drops 24h after each post.
                        </p>
                    </div>
                )}
            </div>
        </Panel>
    );
}
