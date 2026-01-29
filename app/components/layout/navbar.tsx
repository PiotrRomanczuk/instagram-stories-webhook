'use client';

import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useSession, signOut } from 'next-auth/react';
import {
	Home,
	Image as ImageIcon,
	Shield,
	Calendar,
	LogOut,
	Menu,
	X,
	Terminal,
	Users,
	Instagram,
	Languages,
} from 'lucide-react';
import { useState } from 'react';
import { UserRole } from '@/lib/types';
import { useTranslations, useLocale } from 'next-intl';
import { NotificationBell } from './notification-bell';

export function Navbar() {
	const t = useTranslations('Navbar');
	const locale = useLocale();
	const router = useRouter();
	const { data: session } = useSession();
	const pathname = usePathname();
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const toggleLocale = () => {
		const nextLocale = locale === 'en' ? 'pl' : 'en';
		router.replace(pathname, { locale: nextLocale });
	};

	// Don't show navbar on signin page
	if (pathname === '/auth/signin') return null;

	const user = session?.user;
	const isDev = (user as { role?: UserRole })?.role === 'developer';
	const isAdmin = (user as { role?: UserRole })?.role === 'admin';
	const isAdminOrDev = isAdmin || isDev;

	const navItems = [
		{ href: '/', label: t('dashboard'), icon: Home },
		{ href: '/content', label: t('contentHub') || 'Content Hub', icon: ImageIcon },
	];

	if (isAdminOrDev) {
		navItems.push({ href: '/admin/users', label: t('users'), icon: Users });
	}

	if (isDev) {
		// We'll add developer sub-items or a single Dev icon
		navItems.push({ href: '/developer', label: t('devTools'), icon: Terminal });
	}

	const isActive = (path: string) => pathname === path;

	return (
		<nav className='sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200'>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
				<div className='flex items-center justify-between h-16'>
					{/* Logo */}
					<Link
						href='/'
						className='flex items-center gap-2 font-black text-xl tracking-tighter'
					>
						<span className='bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'>
							MARSZAL
						</span>
						<span className='text-slate-900'>ARTS</span>
					</Link>

					{/* Desktop Nav */}
					<div className='hidden md:flex items-center gap-6'>
						{navItems.map((item) => {
							const Icon = item.icon;
							return (
								<Link
									key={item.href}
									href={item.href}
									className={`flex items-center gap-2 text-sm font-bold transition-colors ${
										isActive(item.href)
											? 'text-indigo-600'
											: 'text-slate-600 hover:text-slate-900'
									}`}
								>
									<Icon className='w-4 h-4' />
									{item.label}
								</Link>
							);
						})}
					</div>

					{/* Actions */}
					<div className='hidden md:flex items-center gap-4'>
						{session?.user && <NotificationBell />}

						<button
							onClick={toggleLocale}
							className='p-2 text-slate-500 hover:text-indigo-600 transition-colors rounded-lg bg-slate-50'
							title={locale === 'en' ? 'Switch to Polish' : 'Switch to English'}
						>
							<span className='font-bold text-xs flex items-center gap-1'>
								<Languages className='w-4 h-4' />
								{locale.toUpperCase()}
							</span>
						</button>

						{session?.user ? (
							<div className='flex items-center gap-4'>
								<div className='flex flex-col items-end'>
									<span className='text-sm font-bold text-slate-700'>
										{session.user.name || session.user.email?.split('@')[0]}
									</span>
									{isAdminOrDev && session.user.instagramAccount && (
										<div className='flex items-center gap-1 text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full'>
											<Instagram className='w-3 h-3' />
											<span>
												{session.user.instagramAccount.username || 'Connected'}
											</span>
										</div>
									)}
								</div>
								<button
									onClick={() => signOut({ callbackUrl: '/auth/signin' })}
									className='p-2 text-slate-500 hover:text-red-500 transition-colors bg-slate-100 rounded-lg'
									title='Sign Out'
								>
									<LogOut className='w-4 h-4' />
								</button>
							</div>
						) : (
							<Link
								href='/auth/signin'
								className='px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors'
							>
								{t('signIn')}
							</Link>
						)}
					</div>

					{/* Mobile Menu Button */}
					<button
						className='md:hidden p-2 text-slate-600'
						onClick={() => setIsMenuOpen(!isMenuOpen)}
					>
						{isMenuOpen ? (
							<X className='w-6 h-6' />
						) : (
							<Menu className='w-6 h-6' />
						)}
					</button>
				</div>
			</div>

			{/* Mobile Menu */}
			{isMenuOpen && (
				<div className='md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4'>
					{navItems.map((item) => {
						const Icon = item.icon;
						return (
							<Link
								key={item.href}
								href={item.href}
								onClick={() => setIsMenuOpen(false)}
								className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
									isActive(item.href)
										? 'bg-indigo-50 text-indigo-600'
										: 'text-slate-600 hover:bg-slate-50'
								}`}
							>
								<Icon className='w-5 h-5' />
								<span className='font-bold'>{item.label}</span>
							</Link>
						);
					})}
					<div className='px-4 py-2'>
						<button
							onClick={toggleLocale}
							className='flex items-center gap-3 w-full text-slate-600 hover:text-indigo-600'
						>
							<Languages className='w-5 h-5' />
							<span className='font-bold'>
								Language: {locale.toUpperCase()}
							</span>
						</button>
					</div>
					<div className='pt-4 border-t border-slate-100 flex items-center justify-between px-4'>
						<div className='flex flex-col gap-1'>
							<span className='text-sm font-semibold text-slate-700'>
								{session?.user?.email}
							</span>
							{isAdminOrDev && session?.user?.instagramAccount && (
								<div className='flex items-center gap-1 text-xs text-indigo-600 font-medium'>
									<Instagram className='w-3 h-3' />
									<span>
										{session.user.instagramAccount.username ||
											session.user.instagramAccount.id}
									</span>
								</div>
							)}
						</div>
						<div className='flex items-center gap-4'>
							<button
								onClick={() => signOut({ callbackUrl: '/auth/signin' })}
								className='text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors'
							>
								<LogOut className='w-5 h-5' />
							</button>
						</div>
					</div>
				</div>
			)}
		</nav>
	);
}
