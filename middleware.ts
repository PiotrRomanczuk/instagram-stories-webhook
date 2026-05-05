import { withAuth } from 'next-auth/middleware';
import { getToken } from 'next-auth/jwt';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/lib/types';
import { shouldRedirectToWelcome } from '@/lib/onboarding-gate';

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

/**
 * Role-protected route definitions.
 * Maps path prefixes to the roles that are allowed to access them.
 * Access is granted if the user's role is included in the allowed list.
 */
const ROLE_PROTECTED_ROUTES: Array<{ prefix: string; allowedRoles: UserRole[] }> = [
	{ prefix: '/users', allowedRoles: ['admin', 'developer'] },
	{ prefix: '/developer', allowedRoles: ['admin', 'developer'] },
	{ prefix: '/settings', allowedRoles: ['admin', 'developer'] },
];

function getRoleProtectedRoute(pathname: string) {
	return ROLE_PROTECTED_ROUTES.find((route) =>
		pathname === route.prefix || pathname.startsWith(`${route.prefix}/`),
	);
}

export default async function middleware(req: NextRequest) {
	// Define content that does not require authentication.
	// `/` renders the landing page directly when there's no session, so it's public.
	// `/terms` and `/privacy` must be public so TikTok / Meta crawlers can read them.
	const publicPathnameRegex = RegExp(
		`^(/|/auth/.*|/landing|/terms|/privacy)$`,
		'i',
	);

	const { pathname } = req.nextUrl;
	const isPublicPage = publicPathnameRegex.test(pathname);

	if (isPublicPage) {
		return intlMiddleware(req);
	}

	// If auth isn't configured, render landing at root instead of looping redirects.
	if (!process.env.NEXTAUTH_SECRET) {
		return intlMiddleware(req);
	}

	// Onboarding gate: creators (role 'user') must finish /welcome before
	// reaching any other authenticated page. Admins/developers/demo bypass.
	if (pathname !== '/welcome') {
		const token = await getToken({
			req,
			secret: process.env.NEXTAUTH_SECRET,
		});
		if (token) {
			const redirectToWelcome = shouldRedirectToWelcome({
				pathname,
				role: token.role as UserRole | undefined,
				onboardedAt: (token as { onboardedAt?: number | null }).onboardedAt,
			});
			if (redirectToWelcome) {
				return NextResponse.redirect(new URL('/welcome', req.url));
			}
		}
	}

	// Check role-based access for protected admin/developer routes.
	// We read the JWT token here (Edge-compatible) to avoid a DB call.
	const roleProtectedRoute = getRoleProtectedRoute(pathname);
	if (roleProtectedRoute) {
		const token = await getToken({
			req,
			secret: process.env.NEXTAUTH_SECRET,
		});

		// No token means unauthenticated — let authMiddleware handle the redirect to sign-in
		if (!token) {
			return (authMiddleware as unknown as typeof intlMiddleware)(req);
		}

		const userRole = token.role as UserRole | undefined;
		const isAllowed =
			userRole !== undefined &&
			roleProtectedRoute.allowedRoles.includes(userRole);

		if (!isAllowed) {
			const homeUrl = new URL('/', req.url);
			return NextResponse.redirect(homeUrl);
		}
	}

	return (authMiddleware as unknown as typeof intlMiddleware)(req);
}

export const config = {
	// Match all pathnames except for
	// - … if they start with `/api`, `/_next` or `/_vercel`
	// - … the ones containing a dot (e.g. `favicon.ico`)
	matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
