import React from 'react';

export function HomeHeader() {
    return (
        <div className="text-center mb-12 space-y-4">
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
