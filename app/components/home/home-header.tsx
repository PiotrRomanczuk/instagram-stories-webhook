'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export function HomeHeader() {
    const { data: session } = useSession();

    return (
        <div className="text-center mb-12 space-y-4 relative">
            {session && (
                <button
                    onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                    className="absolute -top-12 right-0 flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50/50 transition-all shadow-sm group"
                >
                    <LogOut className="w-3 h-3 transition-colors" />
                    Log Out Session
                </button>
            )}

            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 mb-2">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">v1.2 Agent Ready</span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight">
                Instagram <span className="text-indigo-600">Stories</span> Webhook
            </h1>
            <p className="text-slate-500 font-medium text-lg leading-relaxed">
                Automate your content publishing with the powerful Meta Graph API.
            </p>
        </div>
    );
}
