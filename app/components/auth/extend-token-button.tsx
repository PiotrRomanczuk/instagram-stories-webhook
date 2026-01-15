'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

export function ExtendTokenButton() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleExtend = async () => {
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/extend-token', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setMessage(`✅ Token extended! Valid for ${data.expires_in_days} days`);
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error) {
            setMessage('❌ Failed to extend token');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <button
                onClick={handleExtend}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Extending...' : 'Extend Token (Make Long-Lived)'}
            </button>
            {message && <p className="text-xs font-medium">{message}</p>}
        </div>
    );
}
