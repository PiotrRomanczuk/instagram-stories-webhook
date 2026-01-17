import Link from 'next/link';
import { ChevronLeft, Terminal } from 'lucide-react';
import { ClientTestForm } from '../components/home/client-form';
import { WebhookSection } from '../components/home/webhook-section';

export default function DeveloperPage() {
    // Since we don't have a database column for webhookUrl yet, we'll construct it from env
    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const webhookUrl = `${appUrl}/api/webhook/story`;

    return (
        <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090b] p-4 md:p-12 lg:p-24 transition-colors duration-300">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors uppercase tracking-widest mb-4 group"
                        >
                            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                            Developer <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-500">Tools</span>
                        </h1>
                        <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium max-w-xl">
                            Test webhooks, verify API integrations, and debug connection issues.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-[#121214] px-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
                        <Terminal className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Dev Mode Active</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Form */}
                    <div>
                        <div className="h-full p-8 md:p-10 bg-white dark:bg-[#121214] rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/50 transition-colors duration-300">
                            <h3 className="text-xl font-black mb-8 text-slate-800 dark:text-white flex items-center gap-3">
                                <span className="flex w-8 h-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    1
                                </span>
                                Quick Debug Publish
                            </h3>
                            <ClientTestForm />
                        </div>
                    </div>

                    {/* Right Column: Webhook Info */}
                    <div>
                        <div className="h-full bg-white dark:bg-[#121214] rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden transition-colors duration-300">
                            <div className="p-8 md:p-10 pb-0">
                                <h3 className="text-xl font-black mb-2 text-slate-800 dark:text-white flex items-center gap-3">
                                    <span className="flex w-8 h-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                        2
                                    </span>
                                    API Configuration
                                </h3>
                            </div>
                            <WebhookSection webhookUrl={webhookUrl} />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
