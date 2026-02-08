'use client';

import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/app/components/ui/button';
import { Spinner } from '@/app/components/ui/spinner';

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
        <Button
            onClick={handleConnect}
            disabled={isLoading}
            variant={isConnected ? 'outline' : 'default'}
            className={`px-8 py-4 h-auto rounded-2xl font-bold text-sm shadow-xl group ${isConnected
                ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-slate-100'
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                }`}
        >
            {isLoading ? (
                <Spinner className="w-5 h-5" />
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
        </Button>
    );
}
