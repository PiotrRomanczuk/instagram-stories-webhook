/**
 * Signed URL endpoint for AI analysis
 * Provides temporary signed URLs for downloading memes from private storage
 * Used by external AI services or internal processing jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import { getSignedAnalysisUrl } from '@/lib/ai-analysis/meme-archiver';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:ai-analysis:signed-url';

/**
 * POST /api/ai-analysis/signed-url
 * Generate signed URL for downloading a meme
 * Body: { storagePath, expiresIn (optional, seconds) }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Admin access required
        if (!session || !isAdmin(session)) {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { storagePath, expiresIn = 3600 } = body;

        if (!storagePath) {
            return NextResponse.json(
                { error: 'Missing required field: storagePath' },
                { status: 400 }
            );
        }

        if (typeof expiresIn !== 'number' || expiresIn < 60 || expiresIn > 604800) {
            return NextResponse.json(
                { error: 'expiresIn must be between 60 and 604800 seconds (1 week)' },
                { status: 400 }
            );
        }

        // Generate signed URL
        const signedUrl = await getSignedAnalysisUrl(storagePath, expiresIn);

        if (!signedUrl) {
            Logger.error(MODULE, 'Failed to generate signed URL', { storagePath });
            return NextResponse.json(
                { error: 'Failed to generate signed URL' },
                { status: 500 }
            );
        }

        Logger.debug(MODULE, 'Generated signed URL', { storagePath, expiresIn });

        return NextResponse.json({
            status: 'success',
            signedUrl,
            expiresIn,
            expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        Logger.error(MODULE, 'Exception in signed URL endpoint', { error: errorMessage });
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
