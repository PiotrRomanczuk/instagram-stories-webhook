/**
 * AI Analysis Management API
 * Endpoints for managing memes sent for AI analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import {
    getPendingAnalysisMemes,
    getAnalysisRecord,
    updateAnalysisResults,
    getSignedAnalysisUrl,
    archiveOldAnalysis
} from '@/lib/ai-analysis/meme-archiver';

/**
 * GET /api/ai-analysis
 * List pending or processed memes for analysis
 * Query params: status (pending|processed|failed|archived), limit (default 50)
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Only admins and developers can view analysis data
        if (!session || !isAdmin(session)) {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'pending';
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        // Get pending memes
        if (status === 'pending') {
            const memes = await getPendingAnalysisMemes(limit);
            return NextResponse.json({
                status: 'success',
                count: memes.length,
                memes
            });
        }

        // For other statuses, would query database differently
        // This is a simplified version for pending memes
        return NextResponse.json({
            status: 'success',
            count: 0,
            memes: [],
            note: 'Implement additional status queries as needed'
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[GET /api/ai-analysis]', error);
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

/**
 * POST /api/ai-analysis/results
 * Submit analysis results for a meme
 * Body: { analysisId, analysisData }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Only admins can update analysis results
        if (!session || !isAdmin(session)) {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { analysisId, analysisData } = body;

        if (!analysisId || !analysisData) {
            return NextResponse.json(
                { error: 'Missing required fields: analysisId, analysisData' },
                { status: 400 }
            );
        }

        // Update with analysis results
        const success = await updateAnalysisResults(analysisId, analysisData);

        if (!success) {
            return NextResponse.json(
                { error: 'Failed to update analysis results' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            status: 'success',
            message: 'Analysis results recorded',
            analysisId
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[POST /api/ai-analysis]', error);
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
