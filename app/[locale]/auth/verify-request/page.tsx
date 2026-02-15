'use client';

import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VerifyRequest() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <Mail className="w-10 h-10 text-indigo-600" />
                </div>

                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-4">Check your email</h1>
                <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                    A magic link has been sent to your email address.
                    Click the link in the email to sign in instantly.
                </p>

                <div className="bg-white rounded-[32px] p-8 border border-gray-200 shadow-xl shadow-indigo-100/20">
                    <p className="text-sm text-gray-400 font-medium mb-6">
                        Didn&apos;t receive the email? Check your spam folder or try again.
                    </p>

                    <Link
                        href="/auth/signin"
                        className="inline-flex items-center gap-2 text-[#2b6cee] font-bold hover:text-[#2b6cee]/80 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </Link>
                </div>

                <div className="mt-12">
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Safety first • No passwords required</p>
                </div>
            </div>
        </div>
    );
}
