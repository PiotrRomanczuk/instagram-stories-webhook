import { NextRequest, NextResponse } from 'next/server';
import { processScheduledPosts } from '@/lib/scheduler/process-service';
import { Logger } from '@/lib/utils/logger';

// Vercel Serverless Function config
export const maxDuration = 300; // 5 minutes max for Pro, 60s for Hobby

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');

    // Only enforce secret in production or if configured
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Guard: Skip cron on preview deployments
    if (
        process.env.DISABLE_CRON === 'true' ||
        (process.env.VERCEL_ENV === 'preview' && process.env.STAGING_MODE !== 'true')
    ) {
        return NextResponse.json(
            { message: 'Cron disabled on preview deployment', skipped: true },
            { status: 200 }
        );
    }

    try {
        const result = await processScheduledPosts();
        return NextResponse.json(result);
    } catch (error) {
        await Logger.error('cron', 'Cron job failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
