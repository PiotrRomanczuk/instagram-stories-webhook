import { NextRequest, NextResponse } from 'next/server';
import { publishMedia } from '@/lib/instagram';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('x-webhook-secret');
        const secret = process.env.WEBHOOK_SECRET;

        if (!secret) {
            console.error('🚨 WEBHOOK_SECRET is not configured in environment variables.');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        if (authHeader !== secret) {
            return NextResponse.json({ error: 'Unauthorized: Invalid webhook secret' }, { status: 401 });
        }

        const body = await request.json();
        const { url, type } = body;

        if (!url) {
            return NextResponse.json({ error: 'Missing "url" in request body' }, { status: 400 });
        }

        const mediaType = type === 'VIDEO' ? 'VIDEO' : 'IMAGE';

        // Trigger publishing
        const result = await publishMedia(url, mediaType, 'STORY');

        return NextResponse.json({ success: true, result });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Webhook Error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
