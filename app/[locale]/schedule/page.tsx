import { ScheduleManager } from '../../components/schedule/schedule-manager';
import { Link } from '@/i18n/routing';
import { ChevronLeft } from 'lucide-react';

export default function SchedulePage() {
	return (
		<main className='min-h-screen bg-[#F8FAFC] p-4 md:p-12 lg:p-24'>
			<div className='max-w-6xl mx-auto space-y-8'>
				<div className='flex flex-col md:flex-row md:items-end justify-between gap-4'>
					<div>
						<Link
							href='/'
							className='inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest mb-4 group'
						>
							<ChevronLeft className='w-4 h-4 transition-transform group-hover:-translate-x-1' />
							Back to Dashboard
						</Link>
						<h1 className='text-4xl md:text-5xl font-black text-slate-900 tracking-tight'>
							Schedule{' '}
							<span className='text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600'>
								Manager
							</span>
						</h1>
						<p className='mt-2 text-slate-500 font-medium max-w-xl'>
							Schedule Instagram stories to be published automatically at
							specific times.
						</p>
					</div>

					<div className='flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100'>
						<div className='w-2 h-2 rounded-full bg-indigo-500 animate-pulse'></div>
						<span className='text-xs font-black text-slate-600 uppercase tracking-widest'>
							Scheduler Active
						</span>
					</div>
				</div>

				<ScheduleManager />

				<footer className='pt-12 border-t border-slate-200 text-center'>
					<p className='text-sm font-medium text-slate-400'>
						Scheduled posts are checked every minute • Instagram Graph API v18.0
					</p>
				</footer>
			</div>
		</main>
	);
}
