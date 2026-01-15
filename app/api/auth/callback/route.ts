import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { saveTokens } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.json({ error }, { status: 400 });
    }

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    const redirectUri = process.env.FB_REDIRECT_URI;

    if (!appId || !appSecret || !redirectUri) {
        return NextResponse.json({ error: 'Configuration missing' }, { status: 500 });
    }

    try {
        // 1. Exchange code for short-lived access token
        const tokenParams = new URLSearchParams({
            client_id: appId,
            client_secret: appSecret,
            redirect_uri: redirectUri,
            code: code,
        });

        const tokenRes = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token?${tokenParams}`);
        const shortLivedToken = tokenRes.data.access_token;

        // 2. Exchange for long-lived access token
        const longLivedParams = new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: shortLivedToken,
        });

        const longLivedRes = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token?${longLivedParams}`);
        const longLivedToken = longLivedRes.data.access_token;
        const expiresInput = longLivedRes.data.expires_in; // Seconds
        const expiresAt = expiresInput ? Date.now() + (expiresInput * 1000) : undefined;

        // Save to DB
        await saveTokens({
            access_token: longLivedToken,
            expires_at: expiresAt,
        });

        return NextResponse.redirect(new URL('/', request.url));
    } catch (err: any) {
        console.error('Auth error:', err.response?.data || err.message);
        return NextResponse.json({ error: 'Authentication failed', details: err.response?.data }, { status: 500 });
    }
}
