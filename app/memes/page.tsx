'use client';

import { MemeManager } from '../components/memes/meme-manager';
import Link from 'next/link';
import { ChevronLeft, Sparkles } from 'lucide-react';

export default function MemesPage() {
    return (
        <main className="min-h-screen bg-[#F8FAFC] pb-24">
            {/* Hero Header */}
            <div className="bg-white border-b border-slate-100 mb-12">
                <div className="max-w-6xl mx-auto px-4 py-12 md:py-20 lg:py-24">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-[11px] font-black text-indigo-600 hover:text-slate-900 transition-colors uppercase tracking-[0.2em] mb-8 group"
                    >
                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to Dashboard
                    </Link>
                    
                    <div className="relative inline-block mb-4">
                        <div className="absolute -top-6 -right-6 animate-bounce">
                            <Sparkles className="w-8 h-8 text-amber-400" />
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none">
                            Community <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">Meme Hub</span>
                        </h1>
                    </div>
                    
                    <p className="mt-6 text-lg md:text-xl text-slate-500 font-medium max-w-2xl leading-relaxed">
                        Submit your best memes for a chance to be featured on our Instagram stories. 
                        Our team reviews every submission!
                    </p>
                </div>
            </div>

            {/* Content Container */}
            <div className="max-w-6xl mx-auto px-4">
                <MemeManager />

                <footer className="mt-24 pt-12 border-t border-slate-200 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Community Feature • Instagram Story Submissions • v1.0
                    </p>
                </footer>
            </div>
        </main>
    );
}
