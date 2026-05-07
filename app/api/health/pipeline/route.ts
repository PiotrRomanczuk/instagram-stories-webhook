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
 * Authorization model:
 *  - Unauthenticated callers receive only `{ status, timestamp }` so the
 *    endpoint can still be used as a coarse uptime probe without leaking
 *    internal infra details (P1-7).
 *  - Callers with a developer/admin session receive the full component
 *    breakdown (versions, disk numbers, account counts).
 *
 * GET /api/health/pipeline
 */

import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, isDeveloper, isDemo } from '@/lib/auth-helpers';
import { Logger } from '@/lib/utils/logger';
import { checkDiskSpace } from '@/lib/storage/local';
import { countArchivedStories } from '@/lib/database/story-archive';
import { countActiveAudioTracks } from '@/lib/database/audio-tracks';
import { getAllTikTokAccounts } from '@/lib/tiktok/auth';
import { getAllLinkedAccounts, isTokenExpired, isTokenExpiringSoon } from '@/lib/database/linked-accounts';

const MODULE = 'health:pipeline';

export const dynamic = 'force-dynamic';

type CoarseStatus = 'ok' | 'degraded' | 'down';

interface FfmpegCheck { healthy: boolean; version?: string }
interface DiskCheck { healthy: boolean; freeGb: number; freePercent: number }
interface InstagramCheck { healthy: boolean; linkedAccounts: number; totalArchived: number }
interface AudioCheck { healthy: boolean; trackCount: number }
interface TikTokCheck {
    healthy: boolean;
    accounts: number;
    expiredCount: number;
    expiringSoonCount: number;
}

export async function GET() {
    const timestamp = new Date().toISOString();

    try {
        const [ffmpeg, disk, instagram, audio, tiktok] = await Promise.all([
            checkFfmpeg(),
            checkDisk(),
            checkInstagram(),
            checkAudio(),
            checkTikTok(),
        ]);

        const session = await getServerSession(authOptions);
        const isPrivileged = (isAdmin(session) || isDeveloper(session)) && !isDemo(session);

        const coarseStatus = resolveCoarseStatus({ ffmpeg, disk, instagram, audio });

        if (!isPrivileged) {
            return NextResponse.json({ status: coarseStatus, timestamp });
        }

        return NextResponse.json({
            status: coarseStatus === 'ok' ? 'healthy' : coarseStatus === 'degraded' ? 'degraded' : 'down',
            components: { ffmpeg, disk, instagram, audio, tiktok },
            timestamp,
        });
    } catch (error) {
        Logger.error(MODULE, 'Health check failed', error);

        // Still try to gate the error detail on session.
        let isPrivileged = false;
        try {
            const session = await getServerSession(authOptions);
            isPrivileged = (isAdmin(session) || isDeveloper(session)) && !isDemo(session);
        } catch {
            isPrivileged = false;
        }

        if (!isPrivileged) {
            return NextResponse.json({ status: 'down', timestamp }, { status: 500 });
        }

        return NextResponse.json(
            { status: 'error', error: error instanceof Error ? error.message : 'Unknown', timestamp },
            { status: 500 },
        );
    }
}

function resolveCoarseStatus(checks: {
    ffmpeg: FfmpegCheck;
    disk: DiskCheck;
    instagram: InstagramCheck;
    audio: AudioCheck;
}): CoarseStatus {
    const results = [checks.ffmpeg.healthy, checks.disk.healthy, checks.instagram.healthy, checks.audio.healthy];
    const allHealthy = results.every(Boolean);
    if (allHealthy) return 'ok';
    const noneHealthy = results.every((h) => !h);
    if (noneHealthy) return 'down';
    return 'degraded';
}

async function checkFfmpeg(): Promise<FfmpegCheck> {
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

async function checkDisk(): Promise<DiskCheck> {
    const space = await checkDiskSpace();
    const freeGb = Math.round(space.freeBytes / 1024 / 1024 / 1024 * 10) / 10;
    return {
        healthy: space.freePercent > 5,
        freeGb,
        freePercent: space.freePercent,
    };
}

async function checkInstagram(): Promise<InstagramCheck> {
    const accounts = await getAllLinkedAccounts();
    const healthy = accounts.length > 0;

    let totalArchived = 0;
    if (accounts.length > 0) {
        totalArchived = await countArchivedStories(accounts[0].user_id);
    }

    return { healthy, linkedAccounts: accounts.length, totalArchived };
}

async function checkAudio(): Promise<AudioCheck> {
    const count = await countActiveAudioTracks();
    return { healthy: count > 0, trackCount: count };
}

async function checkTikTok(): Promise<TikTokCheck> {
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
