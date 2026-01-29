import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getLinkedFacebookAccount } from '@/lib/database/linked-accounts';
import { redirect } from '@/i18n/routing';
import { StatusSection } from '../components/home/status-section';
import HomeHeader from '../components/home/home-header';
import { Link } from '@/i18n/routing';
import { ArrowRight, Terminal, Shield, Sparkles } from 'lucide-react';
import { UserRole } from '@/lib/types';
import { getTranslations } from 'next-intl/server';
import { MemeSubmitForm } from '../components/memes/meme-submit-form';

export default async function Home() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect({ href: '/auth/signin', locale: 'en' });
		// Usually redirect of routing handles locale automatically if passed as string?
		// routing.redirect("/auth/signin")
		// next-intl redirect: redirect('/auth/signin');
	}

	const t = await getTranslations('Home');

	// Check if Facebook is connected via the database
	const linkedAccount = await getLinkedFacebookAccount(session!.user!.id!);

	// Check for valid token and expiration
	// eslint-disable-next-line react-hooks/purity
	const now = Date.now();
	const isExpired = linkedAccount?.expires_at && linkedAccount.expires_at < now;
	const isFacebookConnected =
		!!linkedAccount && !!linkedAccount.ig_user_id && !isExpired;

	return (
		<main className='min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-indigo-500/30'>
			<div className='max-w-7xl mx-auto px-6'>
				<HomeHeader />

				<div className='pb-24 -mt-8 relative z-10'>
					<div className='space-y-8'>
						{/* Connection Status Section - Only for Admin/Developer */}
						{['admin', 'developer'].includes(
							(session!.user as { role?: UserRole }).role || '',
						) && (
							<div className='rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50 bg-white'>
								<StatusSection isConnected={isFacebookConnected} />
							</div>
						)}

						{/* Feature Navigation */}
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							{/* For regular users: show the form directly */}
							{!['admin', 'developer'].includes(
								(session!.user as { role?: UserRole }).role || '',
							) && (
								<div className='md:col-span-2'>
									<MemeSubmitForm />
								</div>
							)}

							{/* For admins/developers: show a card linking to all submissions */}
							{['admin', 'developer'].includes(
								(session!.user as { role?: UserRole }).role || '',
							) && (
								<Link
									href='/memes'
									className='group relative overflow-hidden p-6 rounded-3xl bg-white border border-slate-100 shadow-lg shadow-indigo-500/5 hover:shadow-indigo-500/10 transition-all duration-300'
								>
									<div className='absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity'>
										<Sparkles className='w-24 h-24 text-indigo-500 transform rotate-12 translate-x-4 -translate-y-4' />
									</div>
									<div className='relative z-10'>
										<div className='w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300'>
											<Sparkles className='w-6 h-6 text-indigo-600' />
										</div>
										<h3 className='text-lg font-bold text-slate-900 mb-1'>
											{t('memeSubmissions.title')}
										</h3>
										<p className='text-sm text-slate-500'>
											{t('memeSubmissions.description')}
										</p>
									</div>
								</Link>
							)}

							{['admin', 'developer'].includes(
								(session!.user as { role?: UserRole }).role || '',
							) && (
								<Link
									href='/admin/memes'
									className='group relative overflow-hidden p-6 rounded-3xl bg-white border border-slate-100 shadow-lg shadow-purple-500/5 hover:shadow-purple-500/10 transition-all duration-300'
								>
									<div className='absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity'>
										<Shield className='w-24 h-24 text-purple-500 transform rotate-12 translate-x-4 -translate-y-4' />
									</div>
									<div className='relative z-10'>
										<div className='w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300'>
											<Shield className='w-6 h-6 text-purple-600' />
										</div>
										<h3 className='text-lg font-bold text-slate-900 mb-1'>
											{t('adminDashboard.title')}
										</h3>
										<p className='text-sm text-slate-500'>
											{t('adminDashboard.description')}
										</p>
									</div>
								</Link>
							)}
						</div>

						{/* Dashboard Navigation Cards Only */}

						{/* Developer Tools Link - Only for Admin/Developer */}
						{['admin', 'developer'].includes(
							(session!.user as { role?: UserRole }).role || '',
						) && (
							<div className='flex justify-center pt-8 pb-12'>
								<Link
									href='/developer'
									className='group flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-widest bg-white px-6 py-3 rounded-full border border-slate-100'
								>
									<Terminal className='w-4 h-4' />
									{t('developerTools')}
									<ArrowRight className='w-4 h-4 transition-transform group-hover:translate-x-1' />
								</Link>
							</div>
						)}
					</div>
				</div>
			</div>
		</main>
	);
}
