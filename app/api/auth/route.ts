import { NextResponse } from 'next/server';

export async function GET() {
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const redirectUri = process.env.FB_REDIRECT_URI;

    if (!appId || !redirectUri) {
        return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }

    // Scopes required for Instagram Stories publishing
    const scopes = [
        'instagram_basic',
        'instagram_content_publish',
        'pages_read_engagement',
        'pages_show_list'
    ].join(',');

    // Use the absolute minimal OAuth URL to avoid triggering business login flow
    // Encode redirect_uri to prevent any parsing issues
    const encodedRedirect = encodeURIComponent(redirectUri);
    const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodedRedirect}&scope=${scopes}`;

    return NextResponse.redirect(url);
}
