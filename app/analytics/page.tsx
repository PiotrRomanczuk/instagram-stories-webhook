'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ChevronLeft,
    TrendingUp,
    Users,
    CheckCircle,
    XCircle,
    Calendar,
    BarChart3,
    Clock,
    Award
} from 'lucide-react';
import { UserRole } from '@/lib/types';

interface AnalyticsData {
    totalSubmissions: number;
    approvalRate: number;
    rejectionRate: number;
    scheduledCount: number;
    publishedCount: number;
    pendingCount: number;
    topContributor: { email: string; count: number } | null;
    recentActivity: Array<{
        action: string;
        timestamp: string;
        user: string;
    }>;
}

export default function AnalyticsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [analytics, setAnalytics] = useState<AnalyticsData>({
        totalSubmissions: 0,
        approvalRate: 0,
        rejectionRate: 0,
        scheduledCount: 0,
        publishedCount: 0,
        pendingCount: 0,
        topContributor: null,
        recentActivity: []
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        } else if (status === 'authenticated') {
            const role = (session?.user as { role?: UserRole })?.role;
            if (role !== 'admin' && role !== 'developer') {
                router.push('/');
            } else {
                fetchAnalytics();
            }
        }
    }, [status, session, router]);

    const fetchAnalytics = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/analytics');
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8 lg:p-12">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/admin/memes"
                        className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest mb-4 group"
                    >
                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to Meme Review
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Analytics</span> Dashboard
                            </h1>
                            <p className="text-slate-500 mt-1">
                                Performance insights and metrics
                            </p>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="text-center">
                            <BarChart3 className="w-12 h-12 animate-pulse text-indigo-500 mx-auto mb-4" />
                            <p className="text-slate-600 font-medium">Loading analytics...</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Overview Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                icon={<TrendingUp className="w-6 h-6" />}
                                label="Total Submissions"
                                value={analytics.totalSubmissions}
                                color="indigo"
                            />
                            <StatCard
                                icon={<CheckCircle className="w-6 h-6" />}
                                label="Approval Rate"
                                value={`${analytics.approvalRate.toFixed(1)}%`}
                                color="emerald"
                            />
                            <StatCard
                                icon={<Calendar className="w-6 h-6" />}
                                label="Scheduled Posts"
                                value={analytics.scheduledCount}
                                color="purple"
                            />
                            <StatCard
                                icon={<BarChart3 className="w-6 h-6" />}
                                label="Published"
                                value={analytics.publishedCount}
                                color="blue"
                            />
                        </div>

                        {/* Detailed Stats */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Status Breakdown */}
                            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                                    Status Breakdown
                                </h3>
                                <div className="space-y-3">
                                    <StatusBar
                                        label="Pending Review"
                                        count={analytics.pendingCount}
                                        total={analytics.totalSubmissions}
                                        color="amber"
                                    />
                                    <StatusBar
                                        label="Scheduled"
                                        count={analytics.scheduledCount}
                                        total={analytics.totalSubmissions}
                                        color="indigo"
                                    />
                                    <StatusBar
                                        label="Published"
                                        count={analytics.publishedCount}
                                        total={analytics.totalSubmissions}
                                        color="emerald"
                                    />
                                </div>
                            </div>

                            {/* Top Contributor */}
                            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Award className="w-5 h-5 text-yellow-600" />
                                    Top Contributor
                                </h3>
                                {analytics.topContributor ? (
                                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-100">
                                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                            <Users className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">
                                                {analytics.topContributor.email}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                {analytics.topContributor.count} submissions
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-400 text-sm italic">No submissions yet</p>
                                )}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-600" />
                                Recent Activity
                            </h3>
                            {analytics.recentActivity.length > 0 ? (
                                <div className="space-y-2">
                                    {analytics.recentActivity.map((activity, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-900">
                                                    {activity.action}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {activity.user} • {new Date(activity.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-400 text-sm italic">No recent activity</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

function StatCard({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: 'indigo' | 'emerald' | 'purple' | 'blue';
}) {
    const colorClasses = {
        indigo: 'from-indigo-500 to-indigo-600',
        emerald: 'from-emerald-500 to-emerald-600',
        purple: 'from-purple-500 to-purple-600',
        blue: 'from-blue-500 to-blue-600'
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
            <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-2xl flex items-center justify-center text-white mb-4`}>
                {icon}
            </div>
            <p className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-3xl font-black text-slate-900">{value}</p>
        </div>
    );
}

function StatusBar({ label, count, total, color }: {
    label: string;
    count: number;
    total: number;
    color: 'amber' | 'indigo' | 'emerald';
}) {
    const percentage = total > 0 ? (count / total) * 100 : 0;

    const colorClasses = {
        amber: 'bg-amber-500',
        indigo: 'bg-indigo-500',
        emerald: 'bg-emerald-500'
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <span className="text-sm font-bold text-slate-900">{count}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorClasses[color]} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
