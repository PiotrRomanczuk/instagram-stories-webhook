'use client';

import { useEffect, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Eye, LogOut } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export function DemoModeBanner() {
	const { data: session } = useSession();
	const hasReset = useRef(false);

	// Auto-reset demo data on mount (fire-and-forget)
	useEffect(() => {
		if (session?.user?.role !== 'demo' || hasReset.current) return;
		hasReset.current = true;
		fetch('/api/demo/reset', { method: 'POST' }).catch(() => {
			// Silent fail — demo data reset is best-effort
		});
	}, [session?.user?.role]);

	if (session?.user?.role !== 'demo') return null;

	return (
		<div className="sticky top-0 z-[60] flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
			<Eye className="h-4 w-4 shrink-0" />
			<span>Demo mode &mdash; try reviewing and scheduling content</span>
			<Button
				variant="outline"
				size="sm"
				className="ml-2 h-7 border-amber-700 bg-amber-400/50 px-3 text-xs text-amber-950 hover:bg-amber-400"
				onClick={() => signOut({ callbackUrl: '/landing' })}
			>
				<LogOut className="mr-1 h-3 w-3" />
				Exit Demo
			</Button>
		</div>
	);
}
