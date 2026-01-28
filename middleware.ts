import { withAuth } from 'next-auth/middleware';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const authMiddleware = withAuth(
	function onSuccess(req) {
		return intlMiddleware(req as NextRequest);
	},
	{
		callbacks: {
			authorized: ({ token }) => token != null,
		},
		pages: {
			signIn: '/auth/signin',
		},
	},
);

export default function middleware(req: NextRequest) {
	// Define content that does not require authentication
	// Matches /auth/* or /en/auth/* or /pl/auth/*
	const publicPathnameRegex = RegExp(
		`^(/(${routing.locales.join('|')}))?(/auth/.*)$`,
		'i',
	);

	const isPublicPage = publicPathnameRegex.test(req.nextUrl.pathname);

	if (isPublicPage) {
		return intlMiddleware(req);
	} else {
		// Cast to any because withAuth typing is intricate
		return (authMiddleware as any)(req);
	}
}

export const config = {
	// Match all pathnames except for
	// - … if they start with `/api`, `/_next` or `/_vercel`
	// - … the ones containing a dot (e.g. `favicon.ico`)
	matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
