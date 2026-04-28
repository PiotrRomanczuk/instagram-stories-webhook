import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import '../globals.css';
import { Providers } from '../components/providers/providers';
import { ShellLayout } from '../components/layout/shell-layout';
import { DemoModeBanner } from '../components/demo/DemoModeBanner';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

const plusJakartaSans = Plus_Jakarta_Sans({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const jetBrainsMono = JetBrains_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Marszal-Arts',
	description:
		'Marszal-Arts — unified content queue for the operator’s own Instagram Stories and TikTok videos.',
	icons: {
		icon: '/logo.svg',
		shortcut: '/logo.svg',
		apple: '/logo.svg',
	},
};

export default async function RootLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}>) {
	const { locale } = await params;

	// Ensure that the incoming `locale` is valid
	if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
		notFound();
	}

	// Providing all messages to the client
	const messages = await getMessages();

	return (
		<html lang={locale} suppressHydrationWarning>
			<body
				className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} antialiased`}
			>
				<NextIntlClientProvider messages={messages}>
					<Providers>
						<DemoModeBanner />
						<ShellLayout>{children}</ShellLayout>
					</Providers>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
