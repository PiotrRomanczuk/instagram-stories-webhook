'use client';

import React from 'react';

export default function HomeHeader() {

    return (
        <div className="text-center mb-12 space-y-4 relative pt-12">

            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 mb-2 shadow-sm">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">v1.2 Agent Ready</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight transition-colors duration-300">
                Instagram <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Stories</span> Webhook
            </h1>
            <p className="text-slate-500 font-medium text-lg leading-relaxed mix-blend-multiply">
                Automate your content publishing with the powerful Meta Graph API.
            </p>
        </div>
    );
}
