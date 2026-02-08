'use client';

import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useSession } from 'next-auth/react';
import {
	Home,
	Image as ImageIcon,
	Send,
	ClipboardCheck,
	Calendar,
	Users,
	Terminal,
	Menu,
	Languages,
	Inbox,
	BarChart3,
	LineChart,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '@/lib/types';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Separator } from '@/app/components/ui/separator';
import { cn } from '@/lib/utils';
import { UserMenu } from './user-menu';
import { NotificationBell } from './notification-bell';

interface NavItem {
	href: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	roles?: UserRole[];
}

export function Navbar() {
	const t = useTranslations('Navbar');
	const locale = useLocale();
	const router = useRouter();
	const { data: session, status } = useSession();
	const pathname = usePathname();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// Don't show navbar on signin page
	if (pathname === '/auth/signin') return null;

	const user = session?.user;
	const userRole = (user as { role?: UserRole })?.role;
	const isDev = userRole === 'developer';
	const isAdmin = userRole === 'admin';
	const isAdminOrDev = isAdmin || isDev;

	const toggleLocale = () => {
		const nextLocale = locale === 'en' ? 'pl' : 'en';
		router.replace(pathname, { locale: nextLocale });
	};

	// Navigation items with role-based visibility
	const navItems: NavItem[] = [
		{ href: '/', label: t('dashboard'), icon: Home },
		{ href: '/submit', label: t('submit') || 'Submit', icon: Send },
		{
			href: '/submissions',
			label: t('submissions') || 'My Submissions',
			icon: ImageIcon,
		},
		{
			href: '/review',
			label: t('review') || 'Review',
			icon: ClipboardCheck,
			roles: ['admin', 'developer'],
		},
		{
			href: '/schedule',
			label: t('schedule') || 'Schedule',
			icon: Calendar,
			roles: ['admin', 'developer'],
		},
		{
			href: '/inbox',
			label: t('inbox') || 'Inbox',
			icon: Inbox,
			roles: ['admin', 'developer'],
		},
		{
			href: '/insights',
			label: t('insights') || 'Insights',
			icon: BarChart3,
			roles: ['admin', 'developer'],
		},
		{
			href: '/analytics',
			label: t('analytics') || 'Analytics',
			icon: LineChart,
			roles: ['admin', 'developer'],
		},
		{
			href: '/users',
			label: t('users'),
			icon: Users,
			roles: ['admin', 'developer'],
		},
		{
			href: '/developer',
			label: t('devTools'),
			icon: Terminal,
			roles: ['developer'],
		},
	];

	// Filter items based on user role
	const visibleNavItems = navItems.filter((item) => {
		if (!item.roles) return true;
		return item.roles.includes(userRole as UserRole);
	});

	const isActive = (path: string) => pathname === path;

	// Split nav items for desktop layout
	const primaryNavItems = visibleNavItems.slice(0, 5);
	const secondaryNavItems = visibleNavItems.slice(5);

	return (
		<nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					{/* Logo */}
					<Link href="/" className="flex items-center gap-2">
						<span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-xl font-black tracking-tighter text-transparent">
							MARSZAL
						</span>
						<span className="text-xl font-black tracking-tighter text-foreground">
							ARTS
						</span>
					</Link>

					{/* Desktop Navigation */}
					<div className="hidden items-center gap-1 md:flex">
						{primaryNavItems.map((item) => {
							const Icon = item.icon;
							return (
								<Button
									key={item.href}
									variant={isActive(item.href) ? 'secondary' : 'ghost'}
									size="sm"
									asChild
								>
									<Link href={item.href} className="gap-2">
										<Icon className="h-4 w-4" />
										<span className="hidden lg:inline">{item.label}</span>
									</Link>
								</Button>
							);
						})}

						{secondaryNavItems.length > 0 && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="sm">
										<span className="hidden lg:inline">More</span>
										<Menu className="h-4 w-4 lg:ml-2" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{secondaryNavItems.map((item) => {
										const Icon = item.icon;
										return (
											<DropdownMenuItem key={item.href} asChild>
												<Link href={item.href} className="cursor-pointer gap-2">
													<Icon className="h-4 w-4" />
													{item.label}
												</Link>
											</DropdownMenuItem>
										);
									})}
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>

					{/* Actions */}
					<div className="flex items-center gap-2">
						{/* Language Toggle */}
						<Button
							variant="ghost"
							size="icon"
							onClick={toggleLocale}
							className="hidden sm:flex"
							title={locale === 'en' ? 'Switch to Polish' : 'Switch to English'}
						>
							<Languages className="h-4 w-4" />
							<span className="sr-only">Toggle language</span>
						</Button>

						{/* Notifications */}
						{session?.user && <NotificationBell />}

						{/* User Menu or Sign In */}
						{status === 'loading' ? (
							<div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
						) : session?.user ? (
							<UserMenu
								user={{
									...session.user,
									role: userRole,
									instagramAccount: session.user.instagramAccount,
								}}
							/>
						) : (
							<Button asChild size="sm">
								<Link href="/auth/signin">{t('signIn')}</Link>
							</Button>
						)}

						{/* Mobile Menu Button - hidden when bottom nav is active */}
						<button
							className="hidden max-md:flex max-lg:hidden relative h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
							onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
							aria-label="Toggle menu"
						>
							<div className="flex h-5 w-5 flex-col items-center justify-center">
								<motion.span
									animate={isMobileMenuOpen ? { rotate: 45, y: 0 } : { rotate: 0, y: -4 }}
									transition={{ duration: 0.2 }}
									className="absolute h-[2px] w-5 rounded-full bg-current"
								/>
								<motion.span
									animate={isMobileMenuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
									transition={{ duration: 0.15 }}
									className="absolute h-[2px] w-5 rounded-full bg-current"
								/>
								<motion.span
									animate={isMobileMenuOpen ? { rotate: -45, y: 0 } : { rotate: 0, y: 4 }}
									transition={{ duration: 0.2 }}
									className="absolute h-[2px] w-5 rounded-full bg-current"
								/>
							</div>
						</button>
					</div>
				</div>
			</div>

			{/* Mobile Menu */}
			<AnimatePresence>
				{isMobileMenuOpen && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2, ease: 'easeInOut' }}
						className="overflow-hidden border-t bg-background md:hidden"
					>
						<div className="space-y-1 px-4 py-4">
							{visibleNavItems.map((item, index) => {
								const Icon = item.icon;
								return (
									<motion.div
										key={item.href}
										initial={{ opacity: 0, x: -12 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: index * 0.03, duration: 0.2 }}
									>
										<Button
											variant={isActive(item.href) ? 'secondary' : 'ghost'}
											className="w-full justify-start gap-3"
											asChild
											onClick={() => setIsMobileMenuOpen(false)}
										>
											<Link href={item.href}>
												<Icon className="h-5 w-5" />
												{item.label}
											</Link>
										</Button>
									</motion.div>
								);
							})}
							<Separator className="my-2" />
							<motion.div
								initial={{ opacity: 0, x: -12 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: visibleNavItems.length * 0.03, duration: 0.2 }}
							>
								<Button
									variant="ghost"
									className="w-full justify-start gap-3"
									onClick={() => {
										toggleLocale();
										setIsMobileMenuOpen(false);
									}}
								>
									<Languages className="h-5 w-5" />
									Language: {locale.toUpperCase()}
								</Button>
							</motion.div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</nav>
	);
}
