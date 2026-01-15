import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { LogoutButton } from '../auth/logout-button';
import { ExtendTokenButton } from '../auth/extend-token-button';

interface StatusSectionProps {
    isConnected: boolean;
}

export function StatusSection({ isConnected }: StatusSectionProps) {
    return (
        <div className="p-8 md:p-10 border-b border-slate-50 bg-gradient-to-br from-white to-slate-50/50">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-extrabold flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Connection Status
                </h2>
                {isConnected ? (
                    <div className="flex items-center gap-4">
                        <LogoutButton />
                        <Link href="/schedule" className="group flex items-center gap-2 text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors uppercase tracking-widest border-l border-slate-200 pl-4">
                            Schedule Manager <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <Link href="/debug" className="group flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest border-l border-slate-200 pl-4">
                            Open Debug Center <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                ) : (
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Awaiting Auth</span>
                )}
            </div>

            <div className={`p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-500 ${isConnected ? 'bg-emerald-50/50 border border-emerald-100 ring-4 ring-emerald-50/30' : 'bg-rose-50/50 border border-rose-100 ring-4 ring-rose-50/30'}`}>
                <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${isConnected ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {isConnected ? <CheckCircle2 className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
                    </div>
                    <div>
                        <span className={`text-xl font-black ${isConnected ? 'text-emerald-900' : 'text-rose-900'}`}>
                            {isConnected ? 'Fully Authenticated' : 'Disconnected'}
                        </span>
                        <p className={`text-sm font-medium ${isConnected ? 'text-emerald-700/70' : 'text-rose-700/70'}`}>
                            {isConnected ? 'Tokens are active and ready for use.' : 'Connect your Facebook account to begin.'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-auto">
                    <a
                        href="/api/auth"
                        className={`px-8 py-4 rounded-2xl font-bold text-sm transition shadow-xl flex items-center justify-center gap-3 group ${isConnected
                            ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-slate-100'
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                            }`}
                    >
                        {isConnected ? 'Update Accounts' : 'Connect Facebook'}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </a>
                    {isConnected && <ExtendTokenButton />}
                </div>
            </div>
        </div>
    );
}
