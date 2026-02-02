import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { MemeSubmitForm } from '@/app/components/memes/meme-submit-form';

export default async function SubmitMemePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-[#101622] p-4 md:p-8 lg:p-12">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/memes"
                        className="inline-flex items-center gap-1 text-sm font-bold text-[#2b6cee] hover:text-[#2b6cee]/80 transition-colors uppercase tracking-widest mb-4 group"
                    >
                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        My Submissions
                    </Link>

                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white">
                                Submit a Meme
                            </h1>
                            <p className="text-gray-500 dark:text-[#92a4c9]">
                                Share your best memes with us
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white dark:bg-[#1a2332] rounded-3xl p-6 md:p-8 shadow-xl border border-gray-200 dark:border-[#232f48]">
                    <MemeSubmitForm />
                </div>
            </div>
        </main>
    );
}
