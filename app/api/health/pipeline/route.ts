/**
 * Pipeline Health Check
 *
 * Reports status of each pipeline component:
 * - FFmpeg availability
 * - Disk space
 * - Last archival time
 * - Audio track count
 * - TikTok token status
 *
 * GET /api/health/pipeline
 */

import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { Logger } from '@/lib/utils/logger';
import { checkDiskSpace } from '@/lib/storage/local';
import { countArchivedStories } from '@/lib/database/story-archive';
import { countActiveAudioTracks } from '@/lib/database/audio-tracks';
import { getAllTikTokAccounts } from '@/lib/tiktok/auth';
import { getAllLinkedAccounts, isTokenExpired, isTokenExpiringSoon } from '@/lib/database/linked-accounts';

const MODULE = 'health:pipeline';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [ffmpeg, disk, instagram, audio, tiktok] = await Promise.all([
            checkFfmpeg(),
            checkDisk(),
            checkInstagram(),
            checkAudio(),
            checkTikTok(),
        ]);

        const allHealthy = ffmpeg.healthy && disk.healthy && instagram.healthy && audio.healthy;

        return NextResponse.json({
            status: allHealthy ? 'healthy' : 'degraded',
            components: { ffmpeg, disk, instagram, audio, tiktok },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        Logger.error(MODULE, 'Health check failed', error);
        return NextResponse.json(
            { status: 'error', error: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 },
        );
    }
}

async function checkFfmpeg(): Promise<{ healthy: boolean; version?: string }> {
    return new Promise((resolve) => {
        const proc = spawn('ffmpeg', ['-version']);
        let stdout = '';
        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.on('close', (code) => {
            if (code === 0) {
                const match = stdout.match(/ffmpeg version (\S+)/);
                resolve({ healthy: true, version: match?.[1] ?? 'unknown' });
            } else {
                resolve({ healthy: false });
            }
        });
        proc.on('error', () => resolve({ healthy: false }));
    });
}

async function checkDisk(): Promise<{ healthy: boolean; freeGb: number; freePercent: number }> {
    const space = await checkDiskSpace();
    const freeGb = Math.round(space.freeBytes / 1024 / 1024 / 1024 * 10) / 10;
    return {
        healthy: space.freePercent > 5,
        freeGb,
        freePercent: space.freePercent,
    };
}

async function checkInstagram(): Promise<{ healthy: boolean; linkedAccounts: number; totalArchived: number }> {
    const accounts = await getAllLinkedAccounts();
    const healthy = accounts.length > 0;

    // Get total archived stories count for first account (if any)
    let totalArchived = 0;
    if (accounts.length > 0) {
        totalArchived = await countArchivedStories(accounts[0].user_id);
    }

    return { healthy, linkedAccounts: accounts.length, totalArchived };
}

async function checkAudio(): Promise<{ healthy: boolean; trackCount: number }> {
    const count = await countActiveAudioTracks();
    return { healthy: count > 0, trackCount: count };
}

async function checkTikTok(): Promise<{ healthy: boolean; accounts: number; expiredCount: number; expiringSoonCount: number }> {
    const accounts = await getAllTikTokAccounts();
    const expiredCount = accounts.filter((a) => isTokenExpired(a.expires_at)).length;
    const expiringSoonCount = accounts.filter((a) => isTokenExpiringSoon(a.expires_at)).length;

    return {
        healthy: accounts.length > 0 && expiredCount === 0,
        accounts: accounts.length,
        expiredCount,
        expiringSoonCount,
    };
}
