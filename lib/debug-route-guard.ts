/**
 * Debug Route Guard
 *
 * Centralized authorization guard for /api/debug/* routes.
 *
 * Why this exists:
 * - Debug routes were previously gated only on `NODE_ENV === 'production'`.
 * - Vercel preview deployments often run with `NODE_ENV=development`, which
 *   means the previous guard exposed every debug endpoint on every preview URL.
 * - We now require BOTH a non-production deployment AND a developer-role
 *   session before any debug endpoint will respond.
 */

import { NextResponse } from 'next/server';
import { getSession, isDeveloper } from '@/lib/auth-helpers';

/**
 * Allow when:
 *  1. The request is NOT a Vercel production deployment
 *     (`VERCEL_ENV !== 'production'`), OR the explicit
 *     `ALLOW_DEBUG_ROUTES_IN_PRODUCTION=true` escape hatch is set, AND
 *  2. The caller has a `developer` role session.
 *
 * Returns `null` when allowed; otherwise returns a NextResponse to short-circuit.
 */
export async function guardDebugRoute(): Promise<NextResponse | null> {
    const isVercelProduction = process.env.VERCEL_ENV === 'production';
    const explicitlyAllowed = process.env.ALLOW_DEBUG_ROUTES_IN_PRODUCTION === 'true';

    if (isVercelProduction && !explicitlyAllowed) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const session = await getSession();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isDeveloper(session)) {
        return NextResponse.json({ error: 'Developer access required' }, { status: 403 });
    }

    return null;
}
