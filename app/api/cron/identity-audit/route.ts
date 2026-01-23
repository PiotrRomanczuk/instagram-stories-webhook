import { NextRequest, NextResponse } from 'next/server';
import { runIdentityAudit } from '@/lib/scheduler/identity-service';
import { Logger } from '@/lib/utils/logger';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');

    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const result = await runIdentityAudit();
        return NextResponse.json(result);
    } catch (error) {
        await Logger.error('cron', 'Identity audit failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
