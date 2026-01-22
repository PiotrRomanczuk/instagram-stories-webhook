import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ExtendTokenButton } from '../auth/extend-token-button';
import { ConnectFacebookButton } from '../auth/connect-facebook-button';

interface StatusSectionProps {
    isConnected: boolean;
}

export function StatusSection({ isConnected }: StatusSectionProps) {
    return (
        <div className="p-8 md:p-10 border-b border-slate-50 dark:border-white/5 bg-gradient-to-br from-white to-slate-50/50 dark:from-[#121214] dark:to-[#121214]">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-extrabold flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div> Connection Status
                </h2>
                {isConnected ? (
                    <div className="flex items-center gap-4">
                        <Link href="/schedule" className="group flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors uppercase tracking-widest border-l border-slate-200 dark:border-white/10 pl-4">
                            Schedule Manager <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <Link href="/insights" className="group flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors uppercase tracking-widest border-l border-slate-200 dark:border-white/10 pl-4">
                            Insights <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <Link href="/debug" className="group flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors uppercase tracking-widest border-l border-slate-200 dark:border-white/10 pl-4">
                            Open Debug Center <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                ) : (
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600">Awaiting Auth</span>
                )}
            </div>

            <div className={`p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-500 ${isConnected ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 ring-4 ring-emerald-50/30 dark:ring-emerald-900/20' : 'bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 ring-4 ring-rose-50/30 dark:ring-rose-900/20'}`}>
                <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${isConnected ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {isConnected ? <CheckCircle2 className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
                    </div>
                    <div>
                        <span className={`text-xl font-black ${isConnected ? 'text-emerald-900 dark:text-emerald-100' : 'text-rose-900 dark:text-rose-100'}`}>
                            {isConnected ? 'Fully Authenticated' : 'Disconnected'}
                        </span>
                        <p className={`text-sm font-medium ${isConnected ? 'text-emerald-700/70 dark:text-emerald-300/70' : 'text-rose-700/70 dark:text-rose-300/70'}`}>
                            {isConnected ? 'Tokens are active and ready for use.' : 'Connect your Facebook account to begin.'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-auto">
                    <ConnectFacebookButton isConnected={isConnected} />
                    {isConnected && <ExtendTokenButton />}
                </div>
            </div>
        </div>
    );
}
