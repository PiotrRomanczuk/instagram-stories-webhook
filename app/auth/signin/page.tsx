'use client';

import { signIn } from 'next-auth/react';
import { Instagram } from 'lucide-react';
import { useState } from 'react';

export default function SignIn() {
    const [isLoading, setIsLoading] = useState(false);

    const handleSignIn = async () => {
        try {
            console.log('🔵 Starting Google Sign In...');
            setIsLoading(true);
            const result = await signIn('google', { 
                callbackUrl: '/',
                redirect: true
            });
            console.log('✅ Sign In Result (Frontend):', result);
        } catch (error) {
            console.error('❌ Sign In Error (Frontend):', error);
        } finally {
            // We usually don't set loading back to false on success as it redirects
            // but for debugging we can if it fails
            // setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center p-6">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100 ring-4 ring-white">
                        <Instagram className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
                    <p className="text-slate-500 font-medium mt-2">Sign in with your Google account to manage your stories</p>
                </div>

                <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-2xl shadow-indigo-100/40 border border-slate-100 space-y-4">
                    <button
                        onClick={handleSignIn}
                        disabled={isLoading}
                        className="w-full bg-white border-2 border-slate-100 text-slate-700 py-4 rounded-2xl font-bold text-sm hover:bg-slate-50 hover:border-slate-200 transition-all shadow-xl shadow-indigo-100/20 flex items-center justify-center gap-3 group disabled:opacity-50"
                    >
                        {isLoading ? (
                            <span>Connecting...</span>
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </button>

                    <div className="pt-4 text-center">
                        <p className="text-xs text-slate-400">
                            Facebook/Instagram connections are managed from your dashboard after signing in.
                        </p>
                    </div>
                </div>

                <div className="text-center mt-12">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Protected by NextAuth.js</p>
                </div>
            </div>
        </div>
    );
}
