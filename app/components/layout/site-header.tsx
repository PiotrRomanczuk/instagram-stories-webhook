'use client';

import { SidebarTrigger } from '@/app/components/ui/sidebar';
import { Separator } from '@/app/components/ui/separator';

export function SiteHeader() {
	return (
		<header className="sticky top-0 z-40 flex h-12 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
			<SidebarTrigger />
			<Separator orientation="vertical" className="h-4" />
			<div className="flex items-center gap-2">
				<div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 text-white">
					<span className="font-black text-[11px] leading-none">M</span>
				</div>
				<span className="text-sm font-semibold tracking-tight">Marszal-Arts</span>
			</div>
		</header>
	);
}
