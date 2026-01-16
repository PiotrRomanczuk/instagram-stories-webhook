'use client';

import { useState } from 'react';
import { Copy, CheckCircle2, FlaskConical, Send } from 'lucide-react';

export function ClientTestForm() {
    const [url, setUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ success: boolean, message: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const sampleImageUrl = 'https://img.freepik.com/darmowe-wektory/prosty-wibrujacy-kwadratowy-mem-z-kotem_742173-4493.jpg?semt=ais_hybrid&w=740&q=80';

    const handleCopySampleUrl = () => {
        setUrl(sampleImageUrl);
        navigator.clipboard.writeText(sampleImageUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const res = await fetch('/api/webhook/story', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-webhook-secret': secret
                },
                body: JSON.stringify({ url, type: 'IMAGE' })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed');

            setStatus({ success: true, message: 'Story published successfully!' });
        } catch (err: unknown) {
            setStatus({ success: false, message: err instanceof Error ? err.message : 'An unknown error occurred' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Target Image URL</label>
                    <button
                        type="button"
                        onClick={handleCopySampleUrl}
                        className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 rounded-lg text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                    >
                        {copied ? (
                            <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="w-3 h-3" />
                                Use Sample
                            </>
                        )}
                    </button>
                </div>
                <div className="relative group">
                    <input
                        type="url"
                        required
                        placeholder="https://example.com/image.jpg"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 transition-all font-mono shadow-inner"
                    />
                    <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Webhook Secret <span className="text-slate-400 dark:text-zinc-600 font-normal normal-case">(Optional via .env)</span>
                </label>
                <input
                    type="password"
                    placeholder="Enter x-webhook-secret"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 transition-all font-mono shadow-inner"
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full relative overflow-hidden group bg-slate-900 dark:bg-gradient-to-r dark:from-indigo-600 dark:to-purple-600 text-white py-4 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <div className="relative flex items-center justify-center gap-2">
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Publishing...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            <span>Test Publish (Image)</span>
                        </>
                    )}
                </div>
            </button>

            {status && (
                <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 border ${status.success ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400'}`}>
                    {status.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <FlaskConical className="w-5 h-5 shrink-0" />}
                    {status.message}
                </div>
            )}
        </div>
    );
}
