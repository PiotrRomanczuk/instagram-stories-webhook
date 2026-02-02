'use client';

/**
 * Schedule Sidebar - Left navigation for the StoryFlow schedule page
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
	LayoutDashboard,
	Calendar,
	Library,
	BarChart3,
	Settings,
	BookOpenText,
} from 'lucide-react';

interface NavItem {
	href: string;
	label: string;
	icon: React.ReactNode;
}

const navItems: NavItem[] = [
	{
		href: '/',
		label: 'Dashboard',
		icon: <LayoutDashboard className="h-5 w-5" />,
	},
	{
		href: '/schedule',
		label: 'Schedule',
		icon: <Calendar className="h-5 w-5" />,
	},
	{
		href: '/content',
		label: 'Library',
		icon: <Library className="h-5 w-5" />,
	},
	{
		href: '/analytics',
		label: 'Analytics',
		icon: <BarChart3 className="h-5 w-5" />,
	},
];

export function ScheduleSidebar() {
	const pathname = usePathname();
	const { data: session } = useSession();

	// Extract locale from pathname if present
	const pathSegments = pathname.split('/').filter(Boolean);
	const locale = pathSegments[0]?.length === 2 ? pathSegments[0] : '';
	const currentPath = locale
		? '/' + pathSegments.slice(1).join('/')
		: pathname;

	const buildHref = (href: string) => {
		if (locale) {
			return `/${locale}${href === '/' ? '' : href}`;
		}
		return href;
	};

	const isActive = (href: string) => {
		if (href === '/') {
			return currentPath === '/' || currentPath === '';
		}
		return currentPath.startsWith(href);
	};

	const userEmail = session?.user?.email;
	const userName = userEmail?.split('@')[0] || 'User';
	const userInitials = userName.slice(0, 2).toUpperCase();

	return (
		<aside className="flex h-full w-64 flex-col border-r border-slate-800 bg-[#101622]">
			{/* Logo */}
			<div className="flex items-center gap-3 p-6">
				<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2b6cee] text-white">
					<BookOpenText className="h-5 w-5" />
				</div>
				<div>
					<h1 className="text-sm font-bold text-white">StoryFlow</h1>
					<p className="text-xs text-slate-500">Schedule Manager</p>
				</div>
			</div>

			{/* Navigation */}
			<nav className="flex-1 space-y-1 px-4">
				{navItems.map((item) => {
					const active = isActive(item.href);
					return (
						<Link
							key={item.href}
							href={buildHref(item.href)}
							className={cn(
								'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
								active
									? 'bg-[#2b6cee]/10 text-[#2b6cee]'
									: 'text-slate-400 hover:bg-slate-800 hover:text-white'
							)}
						>
							{item.icon}
							<span>{item.label}</span>
						</Link>
					);
				})}
			</nav>

			{/* User Profile */}
			<div className="border-t border-slate-800 p-4">
				<div className="flex items-center gap-3 rounded-lg p-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2b6cee] text-xs font-bold text-white">
						{userInitials}
					</div>
					<div className="flex-1 min-w-0">
						<p className="truncate text-xs font-semibold text-white">
							{userName}
						</p>
						<p className="truncate text-[10px] text-slate-500">
							{userEmail}
						</p>
					</div>
					<button
						onClick={() => signOut()}
						className="text-slate-400 hover:text-white transition-colors"
						title="Sign out"
					>
						<Settings className="h-4 w-4" />
					</button>
				</div>
			</div>
		</aside>
	);
}
