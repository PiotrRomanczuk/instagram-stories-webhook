'use client';

import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface ConnectFacebookButtonProps {
    isConnected: boolean;
}

export function ConnectFacebookButton({ isConnected }: ConnectFacebookButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { status } = useSession();

    const handleConnect = async () => {
        if (status !== 'authenticated') {
            window.location.href = '/auth/signin';
            return;
        }

        setIsLoading(true);
        // Redirect to our custom linking endpoint
        window.location.href = '/api/auth/link-facebook';
    };

    return (
        <button
            onClick={handleConnect}
            disabled={isLoading}
            className={`px-8 py-4 rounded-2xl font-bold text-sm transition shadow-xl flex items-center justify-center gap-3 group disabled:opacity-70 ${isConnected
                ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-slate-100'
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                }`}
        >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                <>
                    {isConnected ? (
                        <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Update Connection
                        </>
                    ) : (
                        <>
                            Connect Facebook
                        </>
                    )}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
            )}
        </button>
    );
}
