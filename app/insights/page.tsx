
import { InsightsDashboard } from '../components/insights/insights-dashboard';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireAdmin, getSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';

export default async function InsightsPage() {
    const session = await getSession();
    try {
        requireAdmin(session);
    } catch (_) {
        redirect('/');
    }
    return (
        <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-12 lg:p-24">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest mb-4 group"
                        >
                            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                            Performance <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Insights</span>
                        </h1>
                        <p className="mt-2 text-slate-500 font-medium max-w-xl">
                            Analyze the performance of your published Instagram content.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Live Connect</span>
                    </div>
                </div>

                <InsightsDashboard />

                <footer className="pt-12 border-t border-slate-200 text-center">
                    <p className="text-sm font-medium text-slate-400">
                        Metrics are provided directly by the Instagram Graph API
                    </p>
                </footer>
            </div>
        </main>
    );
}
