// Root layout - delegates to [locale]/layout.tsx which provides <html> and <body>
// This file exists because Next.js requires a root layout at app/layout.tsx

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
