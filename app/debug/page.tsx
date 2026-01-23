import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { requireAuth, getSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { DebugPublisher } from '../components/debug/debug-publisher';

export default async function DebugPage() {
    const session = await getSession();
    
    // Only require basic auth for this debug page
    try {
        requireAuth(session);
    } catch (_) {
        redirect('/api/auth/signin');
    }

    return (
        <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-12 lg:p-24">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest mb-4 group"
                    >
                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        Publish <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Debug</span>
                    </h1>
                    <p className="mt-2 text-slate-500 font-medium">
                        Directly test Instagram publishing. This bypasses the scheduler and database completely to isolate API issues.
                    </p>
                </div>

                <DebugPublisher />
                
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl">
                    <h3 className="text-amber-800 font-bold flex items-center gap-2 mb-2">
                        ⚠️ Security Warning
                    </h3>
                    <p className="text-amber-700 text-sm">
                        This is a manual debug tool. Use it only to verify that your Instagram connection is working. 
                        Posts made here will NOT be tracked in your schedule history.
                    </p>
                </div>
            </div>
        </main>
    );
}
