'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useSession } from 'next-auth/react';
import { Home, Calendar, Plus, Check, ClipboardCheck, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/lib/types';

interface NavTab {
	href: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	isFab?: boolean;
}

export function BottomNav() {
	const { data: session } = useSession();
	const pathname = usePathname();

	// Don't show on signin page
	if (pathname === '/auth/signin') return null;

	const user = session?.user;
	const userRole = (user as { role?: UserRole })?.role;

	const tabs: NavTab[] = [
		{ href: '/', label: 'Home', icon: Home },
		{ href: '/schedule', label: 'Schedule', icon: Calendar },
		{ href: '/submit', label: 'New', icon: Plus, isFab: true },
		{ href: '/review', label: 'Review', icon: ClipboardCheck },
		{ href: '/submissions', label: 'Profile', icon: User },
	];

	const isActive = (path: string) => pathname === path;

	return (
		<nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-lg lg:hidden">
			<div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					const active = isActive(tab.href);

					if (tab.isFab) {
						const FabIcon = active ? Check : Icon;
						return (
							<Link
								key={tab.href}
								href={tab.href}
								className="relative -mt-5 flex flex-col items-center"
							>
								<div
									className={cn(
										'flex h-14 w-14 items-center justify-center rounded-full transition-transform active:scale-95',
										active
											? 'bg-white ring-2 ring-[#2b6cee]'
											: 'bg-[#2b6cee] shadow-lg shadow-[#2b6cee]/30'
									)}
								>
									<FabIcon
										className={cn(
											'h-6 w-6',
											active ? 'text-[#2b6cee]' : 'text-white'
										)}
									/>
								</div>
								<span
									className={cn(
										'mt-0.5 text-[10px] font-medium',
										active
											? 'text-[#2b6cee]'
											: 'text-gray-500'
									)}
								>
									{tab.label}
								</span>
							</Link>
						);
					}

					return (
						<Link
							key={tab.href}
							href={tab.href}
							className={cn(
								'relative flex flex-col items-center gap-0.5 px-3 py-1 transition-colors',
								active
									? 'text-[#2b6cee]'
									: 'text-gray-400'
							)}
						>
							<Icon
								className={cn(
									'h-5 w-5 transition-colors',
									active && 'text-[#2b6cee]'
								)}
							/>
							<span
								className={cn(
									'text-[10px] font-medium',
									active && 'font-semibold'
								)}
							>
								{tab.label}
							</span>
							{active && (
								<div className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#2b6cee]" />
							)}
						</Link>
					);
				})}
			</div>
			{/* Safe area spacer for iOS home indicator */}
			<div className="h-[env(safe-area-inset-bottom)]" />
		</nav>
	);
}
