/**
 * TikTok OAuth callback handler.
 * Exchanges authorization code for tokens, saves to linked_accounts.
 *
 * GET /api/auth/link-tiktok/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Logger } from '@/lib/utils/logger';
import { verifySignedState } from '@/lib/utils/crypto-signing';
import { saveTikTokAccount } from '@/lib/tiktok/auth';
import { TikTokTokenResponse } from '@/lib/types/tiktok';

const MODULE = 'auth:tiktok';

export async function GET(req: NextRequest) {
    Logger.info(MODULE, 'TikTok callback received');

    // Build redirect base from NEXTAUTH_URL so we don't land on the upstream
    // host (e.g. localhost) when running behind a tunnel/proxy like Cloudflare.
    const appBase = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || req.url;

    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for errors from TikTok
    if (error) {
        const errorDesc = searchParams.get('error_description');
        Logger.error(MODULE, `TikTok OAuth error: ${error}`, { error, description: errorDesc });
        return NextResponse.redirect(new URL('/?error=tiktok_auth_failed', appBase));
    }

    // Validate session
    if (!session?.user?.id) {
        Logger.warn(MODULE, 'No session found during TikTok callback');
        return NextResponse.redirect(new URL('/auth/signin', appBase));
    }

    const userId = session.user.id;

    // Verify CSRF state
    const cookieState = req.cookies.get('tiktok_link_state')?.value;
    if (!state || state !== cookieState) {
        Logger.error(MODULE, 'State mismatch in TikTok callback', { userId });
        return NextResponse.redirect(new URL('/?error=state_mismatch', appBase));
    }

    const stateSecret = process.env.NEXTAUTH_SECRET || process.env.WEBHOOK_SECRET || '';
    const stateVerification = verifySignedState(state, stateSecret);

    if (!stateVerification.valid || stateVerification.data?.userId !== userId) {
        Logger.error(MODULE, 'State signature verification failed', { userId });
        return NextResponse.redirect(new URL('/?error=invalid_state', appBase));
    }

    if (!code) {
        Logger.error(MODULE, 'No code provided in TikTok callback', { userId });
        return NextResponse.redirect(new URL('/?error=no_code', appBase));
    }

    try {
        const clientKey = process.env.TIKTOK_CLIENT_KEY;
        const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
        const redirectUri = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/auth/link-tiktok/callback`;

        if (!clientKey || !clientSecret) {
            throw new Error('TikTok client credentials not configured');
        }

        // Exchange code for access token
        Logger.info(MODULE, 'Exchanging code for TikTok token', { userId });

        const codeVerifier = req.cookies.get('tiktok_code_verifier')?.value;
        if (!codeVerifier) {
            throw new Error('Missing PKCE code_verifier cookie');
        }

        const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_key: clientKey,
                client_secret: clientSecret,
                code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                code_verifier: codeVerifier,
            }).toString(),
        });

        const tokenData = (await tokenResponse.json()) as TikTokTokenResponse;

        if (!tokenData.access_token) {
            throw new Error('No access token in TikTok response');
        }

        const expiresAt = Date.now() + tokenData.expires_in * 1000;
        const refreshExpiresAt = Date.now() + tokenData.refresh_expires_in * 1000;

        // Save to linked_accounts
        await saveTikTokAccount({
            userId,
            openId: tokenData.open_id,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt,
            refreshExpiresAt,
        });

        Logger.info(MODULE, `TikTok account linked for user ${userId}`, {
            openId: tokenData.open_id,
            expiresIn: tokenData.expires_in,
        });

        const response = NextResponse.redirect(new URL('/?status=tiktok_linked', appBase));
        response.cookies.delete('tiktok_link_state');
        response.cookies.delete('tiktok_code_verifier');
        return response;
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        Logger.error(MODULE, `TikTok linking failed: ${msg}`, err);
        return NextResponse.redirect(new URL('/?error=tiktok_linking_failed', appBase));
    }
}
