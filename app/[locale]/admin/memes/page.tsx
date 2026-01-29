'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { UserRole } from '@/lib/types/posts';
import { MemesDashboard } from '@/app/components/memes/memes-dashboard';

export default function AdminMemesPage() {
	const { data: session, status } = useSession();
	const router = useRouter();

	useEffect(() => {
		if (status === 'unauthenticated') {
			router.push('/auth/signin');
		} else if (status === 'authenticated') {
			const role = (session?.user as { role?: UserRole })?.role;
			if (role !== 'admin' && role !== 'developer') {
				router.push('/');
			}
		}
	}, [status, session, router]);

	if (status === 'loading') {
		return (
			<main className='min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12 flex items-center justify-center'>
				<div className='text-center'>
					<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4'></div>
					<p className='text-slate-500 font-medium'>Loading...</p>
				</div>
			</main>
		);
	}

	return (
		<main className='min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12'>
			<div className='max-w-7xl mx-auto'>
				{/* Header */}
				<div className='mb-8'>
					<Link
						href='/admin/users'
						className='inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest mb-4 group'
					>
						<ChevronLeft className='w-4 h-4 transition-transform group-hover:-translate-x-1' />
						User Whitelist
					</Link>
				</div>

				{/* Unified Dashboard */}
				<MemesDashboard />
			</div>
		</main>
	);
}
