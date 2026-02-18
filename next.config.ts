import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';
import packageJson from './package.json';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
	/* config options here */
	reactCompiler: true,
	env: {
		NEXT_PUBLIC_APP_VERSION: packageJson.version,
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '*.supabase.co',
				port: '',
				pathname: '/storage/v1/object/public/**',
			},
			{
				protocol: 'https',
				hostname: 'picsum.photos',
			},
		],
	},
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff',
					},
					{
						key: 'X-Frame-Options',
						value: 'DENY',
					},
					{
						key: 'X-XSS-Protection',
						value: '1; mode=block',
					},
					{
						key: 'Referrer-Policy',
						value: 'strict-origin-when-cross-origin',
					},
					{
						key: 'Permissions-Policy',
						value: 'camera=(), microphone=(), geolocation=()',
					},
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=31536000; includeSubDomains; preload',
					},
					{
						key: 'Cross-Origin-Embedder-Policy',
						value: 'require-corp',
					},
					{
						key: 'Cross-Origin-Opener-Policy',
						value: 'same-origin',
					},
					{
						key: 'Content-Security-Policy',
						value: [
							"default-src 'self'",
							"script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
							"style-src 'self' 'unsafe-inline'",
							"img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://picsum.photos https://fastly.picsum.photos",
							"media-src 'self' blob: https://*.supabase.co",
							"connect-src 'self' https://*.supabase.co https://graph.facebook.com https://graph.instagram.com https://unpkg.com",
							"worker-src 'self' blob:",
							"frame-ancestors 'none'",
						].join('; '),
					},
				],
			},
		];
	},
};

export default withSentryConfig(withNextIntl(nextConfig), {
	// For all available options, see:
	// https://github.com/getsentry/sentry-javascript/blob/master/packages/nextjs/src/config/types.ts

	// Suppresses source map uploading logs during bundling
	silent: !process.env.CI,
	org: 'bmr-p0',
	project: 'marszal-arts',

	// For all available options, see:
	// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

	// Upload a larger set of source maps for better stack traces (can increase build time)
	widenClientFileUpload: true,

	// Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
	tunnelRoute: '/monitoring',

	// Enables automatic instrumentation of Vercel Cron Monitors.
	// See the following for more information:
	// https://docs.sentry.io/product/crons/
	// https://vercel.com/docs/cron-jobs
	automaticVercelMonitors: true,
});
