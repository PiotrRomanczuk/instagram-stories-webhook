/**
 * TikTok Token Refresh Cron
 *
 * Refreshes TikTok access tokens before they expire (24h expiry).
 * Runs every 12 hours.
 *
 * GET /api/cron/refresh-tiktok-token
 */

import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils/logger';
import { getAllTikTokAccounts, refreshTikTokToken } from '@/lib/tiktok/auth';

const MODULE = 'cron:refresh-tiktok';

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

        Logger.info(MODULE, 'Starting TikTok token refresh');

        const accounts = await getAllTikTokAccounts();

        if (accounts.length === 0) {
            return NextResponse.json({ message: 'No TikTok accounts to refresh', refreshed: 0 });
        }

        let refreshed = 0;
        let failed = 0;

        for (const account of accounts) {
            try {
                if (!account.refresh_token) {
                    Logger.warn(MODULE, `No refresh token for user ${account.user_id}`);
                    failed++;
                    continue;
                }

                const result = await refreshTikTokToken(account.user_id, account.refresh_token);
                if (result) {
                    refreshed++;
                } else {
                    failed++;
                }
            } catch (err) {
                Logger.error(MODULE, `Token refresh failed for user ${account.user_id}`, err);
                failed++;
            }
        }

        Logger.info(MODULE, `TikTok token refresh complete: ${refreshed} refreshed, ${failed} failed`);

        return NextResponse.json({
            success: true,
            totalAccounts: accounts.length,
            refreshed,
            failed,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        Logger.error(MODULE, 'TikTok token refresh cron failed', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 },
        );
    }
}
