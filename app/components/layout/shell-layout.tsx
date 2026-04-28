'use client';

import { usePathname } from '@/i18n/routing';
import { useSession } from 'next-auth/react';
import { SidebarInset, SidebarProvider } from '@/app/components/ui/sidebar';
import { TooltipProvider } from '@/app/components/ui/tooltip';
import { AppSidebar } from './app-sidebar';
import { SiteHeader } from './site-header';
import { HIDDEN_PATHS } from './nav-config';

interface ShellLayoutProps {
	children: React.ReactNode;
}

export function ShellLayout({ children }: ShellLayoutProps) {
	const pathname = usePathname();
	const { status } = useSession();

	// Hide sidebar on explicitly public/marketing routes…
	if (HIDDEN_PATHS.includes(pathname)) {
		return <>{children}</>;
	}

	// …and any time there's no authenticated session (e.g. landing rendered at `/`).
	if (status !== 'authenticated') {
		return <>{children}</>;
	}

	return (
		<TooltipProvider delayDuration={200}>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<SiteHeader />
					<div className="flex-1">{children}</div>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}
