'use client';

import { MemesDashboard } from '../../components/memes/memes-dashboard';
import { Link } from '@/i18n/routing';
import { ChevronLeft, Sparkles } from 'lucide-react';

export default function MemesPage() {
	return (
		<main className='min-h-screen bg-gray-50 dark:bg-[#101622] pb-24'>
			{/* Hero Header */}
			<div className='bg-white dark:bg-[#1a2332] border-b border-gray-200 dark:border-[#232f48] mb-12'>
				<div className='max-w-6xl mx-auto px-4 py-12 md:py-20 lg:py-24'>
					<Link
						href='/'
						className='inline-flex items-center gap-1.5 text-[11px] font-black text-[#2b6cee] hover:text-gray-900 dark:hover:text-white transition-colors uppercase tracking-[0.2em] mb-8 group'
					>
						<ChevronLeft className='w-4 h-4 transition-transform group-hover:-translate-x-1' />
						Back to Dashboard
					</Link>

					<div className='relative inline-block mb-4'>
						<div className='absolute -top-6 -right-6 animate-bounce'>
							<Sparkles className='w-8 h-8 text-amber-400' />
						</div>
						<h1 className='text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tighter leading-none'>
							Community <br />
							<span className='text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500'>
								Meme Hub
							</span>
						</h1>
					</div>

					<p className='mt-6 text-lg md:text-xl text-gray-500 dark:text-[#92a4c9] font-medium max-w-2xl leading-relaxed'>
						Submit your best memes for a chance to be featured on our Instagram
						stories. Our team reviews every submission!
					</p>
				</div>
			</div>

			{/* Content Container */}
			<div className='max-w-6xl mx-auto px-4'>
				<MemesDashboard />

				<footer className='mt-24 pt-12 border-t border-gray-200 dark:border-[#232f48] text-center'>
					<p className='text-xs font-bold text-gray-400 dark:text-[#92a4c9] uppercase tracking-widest'>
						Community Feature • Instagram Story Submissions • v1.0
					</p>
				</footer>
			</div>
		</main>
	);
}
