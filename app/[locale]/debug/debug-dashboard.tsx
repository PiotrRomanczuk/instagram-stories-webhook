'use client';

import { RefreshCw, LayoutDashboard } from 'lucide-react';
import { useDebugData } from '../../components/debug/use-debug-data';
import { TokenInfoPanel } from '../../components/debug/token-info-panel';
import { PermissionsPanel } from '../../components/debug/permissions-panel';
import { PagesPanel } from '../../components/debug/pages-panel';
import { UserProfilePanel } from '../../components/debug/user-profile-panel';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';

export function DebugDashboard() {
	const { data, loading, error, refresh } = useDebugData();

	if (loading) return <LoadingSpinner size={12} />;

	if (error) {
		return (
			<Alert variant="destructive" className="p-8 rounded-3xl bg-rose-50 border-rose-100 text-center flex flex-col items-center">
				<AlertDescription className="text-rose-600 font-bold mb-4">Error: {error}</AlertDescription>
				<Button
					onClick={refresh}
					className="bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700"
				>
					Retry Connection
				</Button>
			</Alert>
		);
	}

	if (!data) return null;

	return (
		<div className='space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700'>
			<div className='flex items-center justify-between'>
				<div>
					<h1 className='text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3'>
						<LayoutDashboard className='w-10 h-10 text-indigo-600' />
						System <span className='text-indigo-600'>Diagnostics</span>
					</h1>
					<p className='text-slate-400 font-medium mt-1'>
						Real-time health check of your Meta API connection.
					</p>
				</div>
				<Button
					variant="outline"
					onClick={refresh}
					className="group rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm"
				>
					<RefreshCw className='w-4 h-4 group-hover:rotate-180 transition-transform duration-500' />
					Refresh Stats
				</Button>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
				<TokenInfoPanel tokenData={data.stored_tokens} />
				<UserProfilePanel profile={data.user_profile} />
				<PermissionsPanel permissions={data.permissions} />
				<PagesPanel pages={data.pages} />
			</div>
		</div>
	);
}
