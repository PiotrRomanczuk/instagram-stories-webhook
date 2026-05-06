import { withAuth } from 'next-auth/middleware';
import { getToken } from 'next-auth/jwt';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/lib/types';

const intlMiddleware = createMiddleware(routing);

/**
 * Detect whether we are running in a real production deployment.
 * We require BOTH NODE_ENV=production and VERCEL_ENV=production so that
 * preview deployments and local builds aren't treated as production.
 */
function isProductionRuntime(): boolean {
	return (
		process.env.NODE_ENV === 'production' &&
		process.env.VERCEL_ENV === 'production'
	);
}

// Fail fast at module load: a production deploy without NEXTAUTH_SECRET is
// catastrophically misconfigured (route protection would silently break).
// Throwing here causes the worker boot to fail before any request is served.
if (isProductionRuntime() && !process.env.NEXTAUTH_SECRET) {
	console.error(
		'[middleware] FATAL: NEXTAUTH_SECRET is not set in production. ' +
			'Refusing to boot — all route protection would be disabled.',
	);
	throw new Error(
		'NEXTAUTH_SECRET must be set in production (middleware would fail open).',
	);
}

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

	// If NEXTAUTH_SECRET is missing we cannot validate sessions. Fail closed
	// in production (return 503) and fail open in dev/preview so local work
	// without the secret still functions.
	if (!process.env.NEXTAUTH_SECRET) {
		if (isProductionRuntime()) {
			console.error(
				'[middleware] NEXTAUTH_SECRET is not configured in production. ' +
					'Refusing request to avoid serving unauthenticated traffic.',
			);
			return new NextResponse('Service Unavailable', { status: 503 });
		}
		console.warn(
			'[middleware] NEXTAUTH_SECRET is not set — allowing request because ' +
				'this is not a production runtime. Set NEXTAUTH_SECRET before deploying.',
		);
		return intlMiddleware(req);
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
