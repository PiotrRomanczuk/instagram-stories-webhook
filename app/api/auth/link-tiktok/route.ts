/**
 * Initiates TikTok OAuth flow for account linking.
 * Redirects user to TikTok authorization page.
 *
 * GET /api/auth/link-tiktok
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Logger } from '@/lib/utils/logger';
import { createSignedState } from '@/lib/utils/crypto-signing';
import { randomBytes, createHash } from 'crypto';

function base64UrlEncode(buf: Buffer): string {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const MODULE = 'auth:tiktok';

export async function GET(req: NextRequest) {
    try {
        Logger.info(MODULE, 'Initiating TikTok link flow');

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            Logger.warn(MODULE, 'No session found, redirecting to signin');
            return NextResponse.redirect(new URL('/auth/signin', req.url));
        }

        const userId = session.user.id;
        const clientKey = process.env.TIKTOK_CLIENT_KEY;
        const redirectUri = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/auth/link-tiktok/callback`;

        if (!clientKey) {
            throw new Error('TIKTOK_CLIENT_KEY not configured');
        }

        // Scopes — read-only for initial review; add video.publish/video.upload after approval
        const scopes = ['user.info.basic', 'video.list'].join(',');

        // Generate signed state for CSRF protection
        const stateSecret = process.env.NEXTAUTH_SECRET || process.env.WEBHOOK_SECRET || '';
        if (!stateSecret) {
            throw new Error('Missing signing secret for OAuth state');
        }
        const state = createSignedState({ userId }, stateSecret);

        // PKCE — TikTok v2 requires code_challenge (S256)
        const codeVerifier = base64UrlEncode(randomBytes(48));
        const codeChallenge = base64UrlEncode(
            createHash('sha256').update(codeVerifier).digest(),
        );

        const tiktokAuthUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
        tiktokAuthUrl.searchParams.set('client_key', clientKey);
        tiktokAuthUrl.searchParams.set('redirect_uri', redirectUri);
        tiktokAuthUrl.searchParams.set('scope', scopes);
        tiktokAuthUrl.searchParams.set('state', state);
        tiktokAuthUrl.searchParams.set('response_type', 'code');
        tiktokAuthUrl.searchParams.set('code_challenge', codeChallenge);
        tiktokAuthUrl.searchParams.set('code_challenge_method', 'S256');

        Logger.info(MODULE, `Redirecting user ${userId} to TikTok OAuth`);

        const response = NextResponse.redirect(tiktokAuthUrl.toString());
        const cookieOpts = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            maxAge: 600, // 10 minutes
        };
        response.cookies.set('tiktok_link_state', state, cookieOpts);
        response.cookies.set('tiktok_code_verifier', codeVerifier, cookieOpts);

        return response;
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        Logger.error(MODULE, `TikTok link initiation failed: ${msg}`, error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
