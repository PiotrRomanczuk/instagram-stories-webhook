import { NextRequest, NextResponse } from 'next/server';
import { processScheduledPosts } from '@/lib/scheduler/process-service';

// This endpoint should be called periodically (e.g., every minute via cron job)
export async function GET(request: NextRequest) {
    try {
        // 🔒 Security Check: Secure with CRON_SECRET
        const authHeader = request.headers.get('authorization');
        const secret = process.env.CRON_SECRET;

        // If secret is defined in env, enforce it
        if (secret && authHeader !== `Bearer ${secret}`) {
            console.error('🔒 Unauthorized cron attempt: Invalid or missing secret');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await processScheduledPosts();

        return NextResponse.json(result);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error processing scheduled posts API:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
