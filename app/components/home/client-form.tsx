'use client';

import { useState } from 'react';
import { Copy, CheckCircle2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Spinner } from '@/app/components/ui/spinner';

export function ClientTestForm() {
    const [url, setUrl] = useState('');
    // Secret is optional and handled by env if missing, hiding it from UI to simplify
    const [secret] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const sampleImageUrl = 'https://img.freepik.com/darmowe-wektory/prosty-wibrujacy-kwadratowy-mem-z-kotem_742173-4493.jpg?semt=ais_hybrid&w=740&q=80';

    const handleCopySampleUrl = () => {
        setUrl(sampleImageUrl);
        navigator.clipboard.writeText(sampleImageUrl);
        setCopied(true);
        toast.success('Sample URL copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

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

            toast.success('Story published successfully triggered!');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Image URL</Label>
                    <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={handleCopySampleUrl}
                        className="text-[10px] font-bold"
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
                    </Button>
                </div>
                <div className="relative group">
                    <Input
                        type="url"
                        required
                        placeholder="https://example.com/image.jpg"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="px-4 py-3 h-auto bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 text-sm text-slate-900 placeholder-slate-400 font-mono shadow-inner"
                    />
                    <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </div>
            </div>

            <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full relative overflow-hidden group bg-slate-900 text-white py-4 h-auto rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <div className="relative flex items-center justify-center gap-2">
                    {loading ? (
                        <>
                            <Spinner className="w-4 h-4 text-white" />
                            <span>Publishing...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            <span>Quick Publish (Image)</span>
                        </>
                    )}
                </div>
            </Button>

            <p className="text-center text-[10px] text-slate-400">
                Webhook secret will be loaded from environment variables.
            </p>
        </div>
    );
}
