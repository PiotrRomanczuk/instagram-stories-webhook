'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useSession } from 'next-auth/react';
import {
	Home,
	Image as ImageIcon,
	Send,
	ClipboardCheck,
	Calendar,
	Menu,
	CheckCircle2,
} from 'lucide-react';
import { UserRole } from '@/lib/types';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { UserMenu } from './user-menu';

interface NavItem {
	href: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	roles?: UserRole[];
}

export function Navbar() {
	const t = useTranslations('Navbar');
	const { data: session, status } = useSession();
	const pathname = usePathname();
	// Don't show navbar on signin or landing page
	if (pathname === '/auth/signin' || pathname === '/landing') return null;

	const user = session?.user;
	const userRole = (user as { role?: UserRole })?.role;
	const isDev = userRole === 'developer';
	const isAdmin = userRole === 'admin';
	const isAdminOrDev = isAdmin || isDev;

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
			href: '/posted-stories',
			label: 'Posted',
			icon: CheckCircle2,
			roles: ['admin', 'developer'],
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
					<div className="flex items-center gap-2">
						<Link href="/" className="flex items-center gap-2">
							<span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-xl font-black tracking-tighter text-transparent">
								ISM
							</span>
							<span className="text-xl font-black tracking-tighter text-foreground">
								Stories Manager
							</span>
						</Link>
						{isAdminOrDev ? (
							<Link
								href="/release-notes"
								className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
							>
								v{process.env.NEXT_PUBLIC_APP_VERSION}
							</Link>
						) : (
							<span className="text-[10px] font-medium text-muted-foreground">
								v{process.env.NEXT_PUBLIC_APP_VERSION}
							</span>
						)}
					</div>

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

					</div>
				</div>
			</div>
		</nav>
	);
}
