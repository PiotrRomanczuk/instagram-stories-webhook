'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { ChevronRight, Sparkles } from 'lucide-react';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from '@/app/components/ui/sidebar';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/app/components/ui/collapsible';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { NAV_GROUPS, filterNavByRole } from './nav-config';
import type { UserRole } from '@/lib/types';

export function AppSidebar() {
	const t = useTranslations('Sidebar');
	const pathname = usePathname();
	const { data: session, status } = useSession();

	const user = session?.user;
	const userRole = (user as { role?: UserRole } | undefined)?.role;
	const groups = filterNavByRole(NAV_GROUPS, userRole);

	const isActive = (href: string) =>
		href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<div className="flex items-center gap-2 px-2 py-1.5">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 text-white shadow-sm">
						<span className="font-black text-[13px] leading-none">M</span>
					</div>
					<div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
						<span className="text-sm font-bold tracking-tight">Marszal-Arts</span>
						<span className="text-[10px] font-medium text-muted-foreground">
							v{process.env.NEXT_PUBLIC_APP_VERSION}
						</span>
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent>
				{groups.map((group) => {
					const groupContent = (
						<SidebarGroupContent>
							<SidebarMenu>
								{group.items.map((item) => {
									const Icon = item.icon;
									return (
										<SidebarMenuItem key={item.href}>
											<SidebarMenuButton
												asChild
												isActive={isActive(item.href)}
												tooltip={t(item.labelKey)}
											>
												<Link href={item.href}>
													<Icon />
													<span>{t(item.labelKey)}</span>
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroupContent>
					);

					if (group.defaultCollapsed) {
						return (
							<Collapsible
								key={group.id}
								defaultOpen={group.items.some((i) => isActive(i.href))}
								className="group/collapsible"
							>
								<SidebarGroup>
									<SidebarGroupLabel asChild>
										<CollapsibleTrigger className="flex w-full items-center justify-between">
											{t(`groups.${group.labelKey}`)}
											<ChevronRight className="ml-auto h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
										</CollapsibleTrigger>
									</SidebarGroupLabel>
									<CollapsibleContent>{groupContent}</CollapsibleContent>
								</SidebarGroup>
							</Collapsible>
						);
					}

					return (
						<SidebarGroup key={group.id}>
							<SidebarGroupLabel>{t(`groups.${group.labelKey}`)}</SidebarGroupLabel>
							{groupContent}
						</SidebarGroup>
					);
				})}
			</SidebarContent>

			<SidebarFooter>
				<div className="flex items-center gap-2 px-1.5 py-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:px-0">
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
					) : null}
					<div className="ml-auto group-data-[collapsible=icon]:ml-0">
						<ThemeToggle />
					</div>
				</div>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}
