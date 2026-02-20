'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { SWRConfig } from 'swr';

interface ProvidersProps {
	children: React.ReactNode;
}

/**
 * Default fetcher for SWR
 * Handles JSON responses and throws errors for non-OK responses
 */
const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) {
		const error: any = new Error('An error occurred while fetching the data.');
		error.info = await res.json();
		error.status = res.status;
		throw error;
	}
	return res.json();
};

export function Providers({ children }: ProvidersProps) {
	return (
		<SessionProvider>
			<SWRConfig
				value={{
					fetcher,
					revalidateOnFocus: false,
					revalidateOnReconnect: true,
					dedupingInterval: 5000,
					shouldRetryOnError: true,
					errorRetryCount: 3,
					errorRetryInterval: 5000,
					onError: (error, key) => {
						console.error('[SWR Error]', { key, error });
					},
				}}
			>
				{children}
			</SWRConfig>
			<Toaster position="top-right" expand={true} richColors />
		</SessionProvider>
	);
}
