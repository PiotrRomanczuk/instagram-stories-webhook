/**
 * Audio Library Refresh Cron
 *
 * Fetches new royalty-free tracks from Pixabay and caches them locally.
 * Runs weekly.
 *
 * GET /api/cron/refresh-audio
 */

import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils/logger';
import { refreshAudioLibrary } from '@/lib/audio/pixabay';

const MODULE = 'cron:refresh-audio';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (process.env.DISABLE_CRON === 'true') {
            return NextResponse.json({ message: 'Cron disabled', skipped: true });
        }

        Logger.info(MODULE, 'Starting audio library refresh');

        const result = await refreshAudioLibrary();

        Logger.info(MODULE, `Audio refresh complete: ${result.cached} new tracks cached`);

        return NextResponse.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        Logger.error(MODULE, 'Audio refresh failed', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 },
        );
    }
}
