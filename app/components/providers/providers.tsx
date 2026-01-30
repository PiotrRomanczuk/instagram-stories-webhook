'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

interface ProvidersProps {
	children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
	return (
		<SessionProvider>
			<ThemeProvider
				attribute="class"
				defaultTheme="light"
				enableSystem={false}
				forcedTheme="light"
			>
				{children}
				<Toaster position="top-right" expand={true} richColors />
			</ThemeProvider>
		</SessionProvider>
	);
}
