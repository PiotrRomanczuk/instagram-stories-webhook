'use client';

import { useState } from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';

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
        <div className="space-y-4">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-700">Image URL</label>
                    <button
                        type="button"
                        onClick={handleCopySampleUrl}
                        className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                    >
                        {copied ? (
                            <>
                                <CheckCircle2 className="w-3 h-3" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="w-3 h-3" />
                                Use Sample Image
                            </>
                        )}
                    </button>
                </div>
                <input
                    type="url"
                    required
                    placeholder="https://example.com/image.jpg"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Webhook Secret (Optional if not set in .env)</label>
                <input
                    type="password"
                    placeholder="Enter x-webhook-secret"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-black text-white py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
            >
                {loading ? 'Publishing...' : 'Test Publish (Image)'}
            </button>

            {status && (
                <div className={`p-3 rounded-md text-sm ${status.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {status.message}
                </div>
            )}
        </div>
    );
}
