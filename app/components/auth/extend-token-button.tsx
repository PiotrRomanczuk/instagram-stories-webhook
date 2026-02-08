'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/app/components/ui/button';

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
                setMessage(`Token extended! Valid for ${data.expires_in_days} days`);
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setMessage(`${data.error}`);
            }
        } catch {
            setMessage('Failed to extend token');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handleExtend}
                disabled={loading}
                className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 text-xs font-bold"
            >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Extending...' : 'Extend Token (Make Long-Lived)'}
            </Button>
            {message && <p className="text-xs font-medium">{message}</p>}
        </div>
    );
}
