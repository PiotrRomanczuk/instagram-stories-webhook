import { NextRequest, NextResponse } from 'next/server';
import { publishStory } from '@/lib/instagram';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, type } = body;

        if (!url) {
            return NextResponse.json({ error: 'Missing "url" in request body' }, { status: 400 });
        }

        const mediaType = type === 'VIDEO' ? 'VIDEO' : 'IMAGE';

        // Trigger publishing
        const result = await publishStory(url, mediaType);

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error('Webhook Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
