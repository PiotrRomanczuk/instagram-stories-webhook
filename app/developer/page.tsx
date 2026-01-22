import Link from 'next/link';
import { ChevronLeft, Terminal, Settings } from 'lucide-react';
import { ClientTestForm } from '../components/home/client-form';
import { WebhookSection } from '../components/home/webhook-section';

export default function DeveloperPage() {
    // Since we don't have a database column for webhookUrl yet, we'll construct it from env
    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const webhookUrl = `${appUrl}/api/webhook/story`;

    return (
        <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-12 lg:p-24 transition-colors duration-300">
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
                            Developer <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Tools</span>
                        </h1>
                        <p className="mt-2 text-slate-500 font-medium max-w-xl">
                            Test webhooks, verify API integrations, and debug connection issues.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
                        <Terminal className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Dev Mode Active</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Form */}
                    <div>
                        <div className="h-full p-8 md:p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 transition-colors duration-300">
                            <h3 className="text-xl font-black mb-8 text-slate-800 flex items-center gap-3">
                                <span className="flex w-8 h-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                    1
                                </span>
                                Quick Debug Publish
                            </h3>
                            <ClientTestForm />
                        </div>
                    </div>

                    {/* Right Column: Webhook Info */}
                    <div>
                        <div className="h-full bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden transition-colors duration-300">
                            <div className="p-8 md:p-10 pb-0">
                                <h3 className="text-xl font-black mb-2 text-slate-800 flex items-center gap-3">
                                    <span className="flex w-8 h-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                                        2
                                    </span>
                                    API Configuration
                                </h3>
                            </div>
                            <WebhookSection webhookUrl={webhookUrl} />
                        </div>
                    </div>
                </div>

                {/* Settings Configuration Card */}
                <div className="mt-8">
                    <Link href="/settings" className="block group">
                        <div className="p-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2.5rem] border border-amber-100 shadow-xl shadow-amber-100/50 transition-all hover:shadow-2xl hover:scale-[1.01] duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                                        <Settings className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-amber-900">
                                            Application Settings
                                        </h3>
                                        <p className="text-sm text-amber-700/70 font-medium">
                                            Configure API keys, credentials, and security tokens for deployment
                                        </p>
                                    </div>
                                </div>
                                <div className="hidden md:flex items-center gap-2 text-amber-600 font-bold text-sm uppercase tracking-wider">
                                    Open Settings
                                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </main>
    );
}
